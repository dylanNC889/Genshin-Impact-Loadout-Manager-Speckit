import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchWeapons } from "../api";
import { Icon, RarityStars } from "../components/ui";
import { formatStat, statLabel } from "../format";

const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
const RARITIES = [5, 4, 3];

export function Weapons() {
  const [q, setQ] = useState("");
  const [weaponType, setWeaponType] = useState("");
  const [rarity, setRarity] = useState("");

  // The API filters by weaponType server-side; name + rarity are filtered client-side.
  const { data, isLoading, error } = useQuery({
    queryKey: ["weapons", weaponType],
    queryFn: () => fetchWeapons(weaponType || undefined),
  });

  const needle = q.trim().toLowerCase();
  const weapons = data
    ?.filter((w) => (rarity ? w.rarity === Number(rarity) : true))
    .filter((w) => (needle ? w.name.toLowerCase().includes(needle) || w.id.includes(needle) : true));

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
      </div>

      {isLoading ? <p className="muted">Loading weapons…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid">
        {weapons?.map((w) => (
          <Link key={w.id} to={`/weapon/${w.id}`} className="char-card">
            <div className="char-card-head">
              <span className="muted small">{w.weaponType}</span>
              <RarityStars rarity={w.rarity} />
            </div>
            <Icon src={w.icon} alt={w.name} size={64} className="char-card-icon" />
            <div className="char-name">{w.name}</div>
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
