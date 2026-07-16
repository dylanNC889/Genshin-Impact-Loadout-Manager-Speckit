import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { fetchWeapons, fetchCharacters } from "../api";
import { Card, Icon, RarityStars, StatRow } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { weaponRecommenders, signatureWeaponHolder } from "../recommendations";

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
  const roster = rosterQ.data ?? [];
  const { top: topPicks, others } = id ? weaponRecommenders(id) : { top: [], others: [] };
  const sigChar = weapon ? signatureWeaponHolder(weapon, roster) : undefined; // released-with holder
  const bis = topPicks.filter((c) => c !== sigChar); // best-in-slot users, minus the signature holder
  const byId = (cid: string) => roster.find((c) => c.id === cid);

  if (weaponsQ.isLoading) return <p className="muted">Loading weapon…</p>;
  if (!weapon) return <p className="muted">No weapon with id “{id}”.</p>;

  const passive = weapon.passive;
  const refValues = passive?.refinements[refinement - 1] ?? passive?.refinements[0] ?? [];
  const sec = weapon.secondaryStat;

  const chip = (cid: string, sig = false) => {
    const c = byId(cid);
    return (
      <Link key={cid} to={`/character/${cid}`} className={`used-by-chip${sig ? " sig" : ""}`}>
        <Icon src={c?.icon} alt="" size={sig ? 32 : 28} />
        <span>{c?.name ?? cid}</span>
      </Link>
    );
  };

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
          <div className="weapon-hero-stats">
            <span>
              <b>{Math.round(weapon.baseATK)}</b> Base ATK
            </span>
            {sec ? (
              <span>
                <b>{formatStat(sec.key, sec.value)}</b> {statLabel(sec.key)}
              </span>
            ) : null}
          </div>
        </div>
        {weapon.splashArt ? (
          <img className="weapon-hero-art" src={weapon.splashArt} alt={weapon.name} loading="lazy" />
        ) : (
          <Icon src={weapon.icon} alt={weapon.name} size={140} />
        )}
      </header>

      <div className="detail-cols">
        <div className="detail-col">
          <Card title="Stats">
          <StatRow
            label="Base ATK"
            value={weapon.baseATKMin ? `${Math.round(weapon.baseATKMin)} → ${Math.round(weapon.baseATK)}` : Math.round(weapon.baseATK)}
          />
          {sec ? (
            <StatRow
              label={statLabel(sec.key)}
              value={
                weapon.secondaryStatMin != null
                  ? `${formatStat(sec.key, weapon.secondaryStatMin)} → ${formatStat(sec.key, sec.value)}`
                  : formatStat(sec.key, sec.value)
              }
            />
          ) : null}
          <StatRow label="Type" value={weapon.weaponType} />
          <StatRow label="Rarity" value={`${weapon.rarity}★`} />
          <p className="muted small stat-foot">Values shown Lv 1 → Lv 90.</p>
        </Card>

        {passive?.name ? (
          <Card title="Passive ability">
            <strong>{passive.name}</strong>
            {passive.refinements.length > 1 ? (
              <label className="talent-control refine-slider">
                <span>Refinement</span>
                <input
                  type="range"
                  min={1}
                  max={passive.refinements.length}
                  value={refinement}
                  onChange={(e) => setRefinement(Number(e.target.value))}
                  className="slider"
                  aria-label="Refinement"
                />
                <span className="slider-value">R{refinement}</span>
              </label>
            ) : null}
            <p className="passive-text">{renderEffect(passive.template, refValues)}</p>
          </Card>
        ) : null}

        <Card title="Recommended by">
          {sigChar ? (
            <div className="rec-group">
              <div className="rec-label sig-label">★ Signature weapon of</div>
              <div className="used-by">{chip(sigChar, true)}</div>
            </div>
          ) : null}
          {bis.length ? (
            <div className="rec-group">
              <div className="rec-label">Best-in-slot for</div>
              <div className="used-by">{bis.map((cid) => chip(cid))}</div>
            </div>
          ) : null}
          {others.length ? (
            <div className="rec-group">
              <div className="rec-label muted">Also recommended by</div>
              <div className="used-by">{others.map((cid) => chip(cid))}</div>
            </div>
          ) : null}
          {!sigChar && !bis.length && !others.length ? (
            <p className="muted small">No characters recommend this weapon in our data.</p>
          ) : null}
          </Card>
        </div>

        <div className="detail-col">
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
        </div>
      </div>
    </div>
  );
}
