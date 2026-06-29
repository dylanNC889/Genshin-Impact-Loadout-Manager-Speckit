import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCharacters } from "../api";
import { ElementBadge, Icon, RarityStars } from "../components/ui";

const ELEMENTS = ["Pyro", "Hydro", "Electro", "Cryo", "Anemo", "Geo", "Dendro"];
const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];

export function Roster() {
  const [q, setQ] = useState("");
  const [element, setElement] = useState("");
  const [weaponType, setWeaponType] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["characters", q, element, weaponType],
    queryFn: () => fetchCharacters({ q, element, weaponType }),
  });

  return (
    <div className="roster">
      <div className="filters">
        <input
          className="search"
          placeholder="Search characters…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search characters"
        />
        <select value={element} onChange={(e) => setElement(e.target.value)} aria-label="Filter by element">
          <option value="">All elements</option>
          {ELEMENTS.map((el) => (
            <option key={el} value={el}>
              {el}
            </option>
          ))}
        </select>
        <select value={weaponType} onChange={(e) => setWeaponType(e.target.value)} aria-label="Filter by weapon">
          <option value="">All weapons</option>
          {WEAPONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <p className="muted">Loading roster…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid">
        {data?.map((c) => (
          <Link key={c.id} to={`/character/${c.id}`} className="char-card">
            <div className="char-card-head">
              <ElementBadge element={c.element} />
              <RarityStars rarity={c.rarity} />
            </div>
            <Icon src={c.icon} alt={c.name} size={64} className="char-card-icon" />
            <div className="char-name">{c.name}</div>
            <div className="muted small">{c.weaponType}</div>
          </Link>
        ))}
      </div>
      {data && data.length === 0 ? <p className="muted">No characters match those filters.</p> : null}
    </div>
  );
}
