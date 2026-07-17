import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCharacters } from "../api";
import { ElementBadge, Icon, RarityStars } from "../components/ui";
import { getFavorites, toggleFavorite } from "../favorites";

const ELEMENTS = ["Pyro", "Hydro", "Electro", "Cryo", "Anemo", "Geo", "Dendro"];
const WEAPONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
const RARITIES = [5, 4];
const REGIONS = ["Mondstadt", "Liyue", "Inazuma", "Sumeru", "Fontaine", "Natlan", "Snezhnaya"];

export function Roster() {
  // Filters live in the URL query so a filtered view is bookmarkable/shareable (C5).
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const element = params.get("element") ?? "";
  const weaponType = params.get("weapon") ?? "";
  const rarity = params.get("rarity") ?? "";
  const region = params.get("region") ?? "";
  const sort = params.get("sort") ?? "name";
  const setParam = (key: string, value: string, def = "") => {
    const next = new URLSearchParams(params);
    if (value && value !== def) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const [favs, setFavs] = useState(() => getFavorites());

  const { data, isLoading, error } = useQuery({
    queryKey: ["characters", q, element, weaponType],
    queryFn: () => fetchCharacters({ q, element, weaponType }),
  });

  function onToggleFav(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setFavs(new Set(toggleFavorite(id)));
  }

  // rarity/region filtering + sort are client-side; favourites always float to the top.
  const rows = (data ?? [])
    .filter((c) => (rarity ? c.rarity === Number(rarity) : true))
    .filter((c) => (region ? c.region === region : true))
    .slice()
    .sort((a, b) => {
      const fa = favs.has(a.id);
      const fb = favs.has(b.id);
      if (fa !== fb) return fa ? -1 : 1;
      if (sort === "rarity") return b.rarity - a.rarity || a.name.localeCompare(b.name);
      if (sort === "element") return a.element.localeCompare(b.element) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="roster">
      <div className="filters">
        <input
          className="search"
          placeholder="Search characters…"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          aria-label="Search characters"
        />
        <select value={element} onChange={(e) => setParam("element", e.target.value)} aria-label="Filter by element">
          <option value="">All elements</option>
          {ELEMENTS.map((el) => (
            <option key={el} value={el}>
              {el}
            </option>
          ))}
        </select>
        <select value={weaponType} onChange={(e) => setParam("weapon", e.target.value)} aria-label="Filter by weapon">
          <option value="">All weapons</option>
          {WEAPONS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select value={rarity} onChange={(e) => setParam("rarity", e.target.value)} aria-label="Filter by rarity">
          <option value="">All rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={String(r)}>
              {r}★
            </option>
          ))}
        </select>
        <select value={region} onChange={(e) => setParam("region", e.target.value)} aria-label="Filter by region">
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setParam("sort", e.target.value, "name")} aria-label="Sort by">
          <option value="name">Sort: Name</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="element">Sort: Element</option>
        </select>
        <Link to="/character-compare" className="btn ghost">
          ⇄ Compare characters
        </Link>
      </div>

      {isLoading ? <p className="muted">Loading roster…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid">
        {rows.map((c) => (
          <Link key={c.id} to={`/character/${c.id}`} className={`char-card rarity-${c.rarity}`}>
            <div className="char-card-head">
              <ElementBadge element={c.element} />
              <div className="card-head-right">
                <RarityStars rarity={c.rarity} />
                <button
                  type="button"
                  className="fav-btn"
                  onClick={(e) => onToggleFav(e, c.id)}
                  aria-pressed={favs.has(c.id)}
                  aria-label={favs.has(c.id) ? `Unfavourite ${c.name}` : `Favourite ${c.name}`}
                >
                  {favs.has(c.id) ? "★" : "☆"}
                </button>
              </div>
            </div>
            <Icon src={c.icon} alt={c.name} size={64} className="char-card-icon" />
            <div className="char-name">{c.name}</div>
            <div className="muted small">{c.weaponType}</div>
          </Link>
        ))}
      </div>
      {rows.length === 0 && !isLoading ? <p className="muted">No characters match those filters.</p> : null}
    </div>
  );
}
