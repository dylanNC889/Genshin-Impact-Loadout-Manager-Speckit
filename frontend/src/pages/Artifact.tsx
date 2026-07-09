import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import type { StatValue } from "@app/contracts";
import { fetchArtifactSets, fetchCharacters } from "../api";
import { Card, Icon } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { recommendingCharacters } from "../recommendations";

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
  const usedBy = id ? recommendingCharacters(id) : [];
  const byId = (cid: string) => rosterQ.data?.find((c) => c.id === cid);

  if (setsQ.isLoading) return <p className="muted">Loading artifact set…</p>;
  if (!set) return <p className="muted">No artifact set with id “{id}”.</p>;

  const two = bonusText(set.bonus2);
  const four = bonusText(set.bonus4);

  return (
    <div className="detail">
      <Link to="/artifacts" className="back">
        ← Back to artifacts
      </Link>
      <div className="char-header">
        <div className="char-header-top">
          <Icon src={set.icon} alt={set.name} size={72} />
          <h1>{set.name}</h1>
        </div>
      </div>

      <div className="char-body">
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
            <p className="muted small">No characters recommend this set in our data.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
