import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchWeapons } from "../api";
import { Icon, RarityStars } from "../components/ui";
import { getOwned, toggleOwned } from "../ownership";
import { formatStat, statLabel } from "../format";

const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
const RARITIES = [5, 4, 3];
const SORTS = [
  { key: "rarity", label: "Rarity" },
  { key: "atk", label: "Base ATK" },
  { key: "name", label: "Name" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

export function Weapons() {
  const [q, setQ] = useState("");
  const [weaponType, setWeaponType] = useState("");
  const [rarity, setRarity] = useState("");
  const [sort, setSort] = useState<SortKey>("rarity");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [owned, setOwned] = useState(() => getOwned("weapons"));

  // The API filters by weaponType server-side; name + rarity are filtered client-side.
  const { data, isLoading, error } = useQuery({
    queryKey: ["weapons", weaponType],
    queryFn: () => fetchWeapons(weaponType || undefined),
  });

  const needle = q.trim().toLowerCase();
  const weapons = data
    ?.filter((w) => (ownedOnly ? owned.has(w.id) : true))
    .filter((w) => (rarity ? w.rarity === Number(rarity) : true))
    .filter((w) => (needle ? w.name.toLowerCase().includes(needle) || w.id.includes(needle) : true))
    .slice()
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "atk") return b.baseATK - a.baseATK;
      return b.rarity - a.rarity || b.baseATK - a.baseATK; // rarity desc, then ATK
    });

  return (
    <div className="roster">
      <div className="filters">
        <input
          className="search"
          placeholder="Search weapons…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search weapons"
        />
        <select value={weaponType} onChange={(e) => setWeaponType(e.target.value)} aria-label="Filter by weapon type">
          <option value="">All types</option>
          {WEAPONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Filter by rarity">
          <option value="">All rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={String(r)}>
              {r}★
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        <label className="saved-only-toggle">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
            aria-label="Owned weapons only"
          />
          Owned only ({owned.size})
        </label>
        <Link to="/weapon-compare" className="btn ghost">
          ⇄ Compare weapons
        </Link>
      </div>

      {isLoading ? <p className="muted">Loading weapons…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid">
        {weapons?.map((w) => (
          <Link key={w.id} to={`/weapon/${w.id}`} className={`char-card rarity-${w.rarity}`}>
            <div className="char-card-head">
              <span className="muted small">{w.weaponType}</span>
              <div className="card-head-right">
                <RarityStars rarity={w.rarity} />
                <button
                  type="button"
                  className={`own-btn${owned.has(w.id) ? " owned" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOwned(new Set(toggleOwned("weapons", w.id)));
                  }}
                  aria-pressed={owned.has(w.id)}
                  aria-label={owned.has(w.id) ? `Mark ${w.name} not owned` : `Mark ${w.name} owned`}
                  title={owned.has(w.id) ? "Owned" : "Not owned"}
                >
                  {owned.has(w.id) ? "✓" : "＋"}
                </button>
              </div>
            </div>
            <Icon src={w.icon} alt={w.name} size={64} className="char-card-icon" />
            <div className="char-name">{w.name}</div>
            {w.passive?.name ? <div className="muted small weapon-card-passive">{w.passive.name}</div> : null}
            <div className="ref-stats">
              <span className="muted small">Base ATK {Math.round(w.baseATK)}</span>
              {w.secondaryStat ? (
                <span className="muted small">
                  {statLabel(w.secondaryStat.key)} {formatStat(w.secondaryStat.key, w.secondaryStat.value)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {weapons && weapons.length === 0 ? <p className="muted">No weapons match those filters.</p> : null}
    </div>
  );
}
