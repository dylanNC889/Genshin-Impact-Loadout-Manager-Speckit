import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchFoods } from "../api";
import { Icon, RarityStars } from "../components/ui";

const TYPES = ["ATK", "DEF", "Adventure", "Revival"];

/** Buff / revival food reference (D2). */
export function FoodPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["foods"], queryFn: fetchFoods });

  const needle = q.trim().toLowerCase();
  const foods = data
    ?.filter((f) => (type ? f.type === type : true))
    .filter((f) => (needle ? f.name.toLowerCase().includes(needle) : true));

  return (
    <div className="roster">
      <h1>Food buffs</h1>
      <p className="muted small">Dishes that boost stats or revive — the effect shown is at max (Delicious) quality.</p>
      <div className="filters">
        <input
          className="search"
          placeholder="Search food…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search food"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <p className="muted">Loading food…</p> : null}
      {error ? <p className="error">Failed to load: {(error as Error).message}</p> : null}

      <div className="grid wide">
        {foods?.map((f) => (
          <Link key={f.id} to={`/food/${f.id}`} className="char-card set-card">
            <div className="set-head">
              <Icon src={f.icon} alt={f.name} size={44} />
              <div>
                <div className="char-name">{f.name}</div>
                <div className="char-tags">
                  <RarityStars rarity={f.rarity} />
                  <span className="badge muted-badge">{f.type}</span>
                </div>
              </div>
            </div>
            <p className="set-bonus">{f.effect}</p>
          </Link>
        ))}
      </div>
      {foods && foods.length === 0 ? <p className="muted">No food matches those filters.</p> : null}
    </div>
  );
}
