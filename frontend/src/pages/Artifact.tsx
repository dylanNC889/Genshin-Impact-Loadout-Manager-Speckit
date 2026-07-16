import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import type { StatValue } from "@app/contracts";
import { fetchArtifactSets, fetchCharacters } from "../api";
import { Card, Icon, RarityStars } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { setRecommenders, signatureSetHolder } from "../recommendations";

function bonusText(bonus?: { description: string; statBonuses: StatValue[] }): string | null {
  if (!bonus) return null;
  if (bonus.description) return bonus.description;
  if (bonus.statBonuses.length) {
    return bonus.statBonuses.map((s) => `${statLabel(s.key)} +${formatStat(s.key, s.value)}`).join(", ");
  }
  return null;
}

export function ArtifactPage() {
  const { id } = useParams<{ id: string }>();
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });

  const set = setsQ.data?.find((s) => s.id === id);
  const roster = rosterQ.data ?? [];
  const { top: topPicks, others } = id ? setRecommenders(id) : { top: [], others: [] };
  const sigChar = set ? signatureSetHolder(set, roster) : undefined; // set released-with holder
  const bis = topPicks.filter((c) => c !== sigChar);
  const byId = (cid: string) => roster.find((c) => c.id === cid);

  if (setsQ.isLoading) return <p className="muted">Loading artifact set…</p>;
  if (!set) return <p className="muted">No artifact set with id “{id}”.</p>;

  const two = bonusText(set.bonus2);
  const four = bonusText(set.bonus4);

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
      <Link to="/artifacts" className="back">
        ← Back to artifacts
      </Link>
      <div className="char-header">
        <div className="char-header-top">
          <Icon src={set.icon} alt={set.name} size={72} />
          <div>
            <h1>{set.name}</h1>
            {set.rarities.length ? (
              <div className="char-tags">
                <RarityStars rarity={Math.max(...set.rarities)} />
                <span className="muted small">{set.pieces.length ? `${set.pieces.length}-piece set` : ""}</span>
              </div>
            ) : null}
            {set.domain ? (
              <p className="muted small artifact-source">
                ⛏ Farmed at {set.domain.name}
                {set.domain.region ? ` · ${set.domain.region}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="detail-masonry">
        <Card title="Set bonuses">
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
        </Card>

        {set.pieces.length ? (
          <Card title="Pieces">
            <ul className="piece-list">
              {set.pieces.map((p) => (
                <li key={p.slot} className="piece">
                  <Icon src={p.icon} alt={p.name} size={44} />
                  <div className="piece-info">
                    <div className="piece-name">
                      {p.name} <span className="piece-slot">{p.slot}</span>
                    </div>
                    {p.description ? <p className="piece-desc muted small">{p.description}</p> : null}
                    {p.story ? (
                      <details className="piece-lore">
                        <summary>Lore</summary>
                        <p className="piece-story muted small">{p.story}</p>
                      </details>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card title="Recommended by">
          {sigChar ? (
            <div className="rec-group">
              <div className="rec-label sig-label">★ Signature set of</div>
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
            <p className="muted small">No characters recommend this set in our data.</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
