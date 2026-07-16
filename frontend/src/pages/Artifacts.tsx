import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchArtifactSets } from "../api";
import { Icon, RarityStars } from "../components/ui";
import { formatStat, statLabel } from "../format";
import type { StatValue } from "@app/contracts";

/** Bonus description, falling back to a formatted stat list when genshin-db has no text. */
function bonusText(bonus?: { description: string; statBonuses: StatValue[] }): string | null {
  if (!bonus) return null;
  if (bonus.description) return bonus.description;
  if (bonus.statBonuses.length) {
    return bonus.statBonuses.map((s) => `${statLabel(s.key)} +${formatStat(s.key, s.value)}`).join(", ");
  }
  return null;
}

const SORTS = [
  { key: "name", label: "Name" },
  { key: "newest", label: "Newest" },
  { key: "rarity", label: "Rarity" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

/** Numeric ordering for a "major.minor" version string ("4.10" > "4.2"). */
const versionNum = (v: string) => {
  const [maj, min] = v.split(".").map(Number);
  return (maj || 0) * 1000 + (min || 0);
};
const maxRarity = (rs: number[]) => (rs.length ? Math.max(...rs) : 0);

export function Artifacts() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");

  const { data, isLoading, error } = useQuery({
    queryKey: ["artifact-sets"],
    queryFn: () => fetchArtifactSets(),
  });

  const needle = q.trim().toLowerCase();
  const sets = data
    ?.filter((s) => (needle ? s.name.toLowerCase().includes(needle) || s.id.includes(needle) : true))
    .slice()
    .sort((a, b) => {
      if (sort === "newest") return versionNum(b.version) - versionNum(a.version) || a.name.localeCompare(b.name);
      if (sort === "rarity") return maxRarity(b.rarities) - maxRarity(a.rarities) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="roster">
      <div className="filters">
        <input
          className="search"
          placeholder="Search artifact sets…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search artifact sets"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <p className="muted">Loading artifact sets…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid wide">
        {sets?.map((s) => {
          const two = bonusText(s.bonus2);
          const four = bonusText(s.bonus4);
          return (
            <Link key={s.id} to={`/artifact/${s.id}`} className="char-card set-card">
              <div className="set-head">
                <Icon src={s.icon} alt={s.name} size={48} />
                <div>
                  <div className="char-name">{s.name}</div>
                  {s.rarities.length ? <RarityStars rarity={Math.max(...s.rarities)} /> : null}
                </div>
              </div>
              {two ? (
                <p className="set-bonus">
                  <span className="set-bonus-label">2-Piece</span> {two}
                </p>
              ) : null}
              {four ? (
                <p className="set-bonus">
                  <span className="set-bonus-label">4-Piece</span> {four}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
      {sets && sets.length === 0 ? <p className="muted">No artifact sets match that search.</p> : null}
    </div>
  );
}
