import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { fetchWeapons, fetchCharacters } from "../api";
import { Card, Icon, RarityStars, StatRow } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { recommendingCharacters } from "../recommendations";

/** Render an effect template, substituting {0}/{1}… with the refinement values (highlighted). */
function renderEffect(template: string, values: string[]) {
  return template.split(/(\{\d+\})/g).map((part, i) => {
    const m = part.match(/^\{(\d+)\}$/);
    if (m) {
      return (
        <b key={i} className="hl">
          {values[Number(m[1])] ?? part}
        </b>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function WeaponPage() {
  const { id } = useParams<{ id: string }>();
  const [refinement, setRefinement] = useState(1);
  const [showStory, setShowStory] = useState(false);
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });

  const weapon = weaponsQ.data?.find((w) => w.id === id);
  const usedBy = id ? recommendingCharacters(id) : [];
  const byId = (cid: string) => rosterQ.data?.find((c) => c.id === cid);

  if (weaponsQ.isLoading) return <p className="muted">Loading weapon…</p>;
  if (!weapon) return <p className="muted">No weapon with id “{id}”.</p>;

  const passive = weapon.passive;
  const refValues = passive?.refinements[refinement - 1] ?? passive?.refinements[0] ?? [];

  return (
    <div className="detail">
      <Link to="/weapons" className="back">
        ← Back to weapons
      </Link>

      <header className={`weapon-hero rarity-${weapon.rarity}`}>
        <div className="weapon-hero-info">
          <div className="char-tags">
            <span className="badge muted-badge">{weapon.weaponType}</span>
            <RarityStars rarity={weapon.rarity} />
          </div>
          <h1>{weapon.name}</h1>
          {passive?.name ? <p className="weapon-hero-passive">{passive.name}</p> : null}
        </div>
        {weapon.splashArt ? (
          <img className="weapon-hero-art" src={weapon.splashArt} alt={weapon.name} loading="lazy" />
        ) : (
          <Icon src={weapon.icon} alt={weapon.name} size={96} />
        )}
      </header>

      <div className="char-body">
        <Card title="Stats (Lv 90)">
          <StatRow label="Base ATK" value={Math.round(weapon.baseATK)} />
          {weapon.secondaryStat ? (
            <StatRow
              label={statLabel(weapon.secondaryStat.key)}
              value={formatStat(weapon.secondaryStat.key, weapon.secondaryStat.value)}
            />
          ) : null}
        </Card>

        {passive?.name ? (
          <Card title="Passive ability">
            <div className="passive-head">
              <strong>{passive.name}</strong>
              {passive.refinements.length > 1 ? (
                <label className="refine-select">
                  Refinement
                  <select value={refinement} onChange={(e) => setRefinement(Number(e.target.value))} aria-label="Refinement">
                    {passive.refinements.map((_, i) => (
                      <option key={i} value={i + 1}>
                        R{i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <p className="passive-text">{renderEffect(passive.template, refValues)}</p>
          </Card>
        ) : null}

        {weapon.description || weapon.story ? (
          <Card title="Lore">
            {weapon.description ? <p className="weapon-desc">{weapon.description}</p> : null}
            {weapon.story ? (
              <>
                <button className="btn ghost small" onClick={() => setShowStory((s) => !s)}>
                  {showStory ? "Hide story" : "Read story"}
                </button>
                {showStory ? <p className="weapon-story">{weapon.story}</p> : null}
              </>
            ) : null}
          </Card>
        ) : null}

        <Card title={`Recommended by (${usedBy.length})`}>
          {usedBy.length ? (
            <div className="used-by">
              {usedBy.map((cid) => {
                const c = byId(cid);
                return (
                  <Link key={cid} to={`/character/${cid}`} className="used-by-chip">
                    <Icon src={c?.icon} alt="" size={28} />
                    <span>{c?.name ?? cid}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted small">No characters recommend this weapon in our data.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
