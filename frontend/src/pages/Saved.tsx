import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  listLoadouts,
  listTeams,
  duplicateLoadout,
  deleteLoadout,
  duplicateTeam,
  deleteTeam,
  fetchCharacters,
  type SavedLoadout,
} from "../api";
import { Card } from "../components/ui";
import { formatStat } from "../format";

export function SavedPage() {
  const qc = useQueryClient();
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const rosterQ = useQuery({ queryKey: ["characters", "saved"], queryFn: () => fetchCharacters({}) });

  const nameById = (id: string) => rosterQ.data?.find((c) => c.id === id)?.name ?? id;
  const statOf = (l: SavedLoadout, key: string) =>
    l.computedFinalStats.find((s) => s.key === key)?.value ?? 0;

  const dupL = useMutation({ mutationFn: duplicateLoadout, onSuccess: () => qc.invalidateQueries({ queryKey: ["loadouts"] }) });
  const delL = useMutation({ mutationFn: deleteLoadout, onSuccess: () => qc.invalidateQueries({ queryKey: ["loadouts"] }) });
  const dupT = useMutation({ mutationFn: duplicateTeam, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
  const delT = useMutation({ mutationFn: deleteTeam, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });

  return (
    <div className="saved">
      <h1>Saved</h1>
      <div className="saved-grid">
        <Card title={`Loadouts (${loadoutsQ.data?.length ?? 0})`}>
          {loadoutsQ.data?.length ? (
            <ul className="saved-list">
              {loadoutsQ.data.map((l) => (
                <li key={l.id}>
                  <div className="saved-info">
                    <span className="saved-name">{l.name}</span>
                    <span className="muted small">
                      {nameById(l.characterId)} · ATK {Math.round(statOf(l, "ATK"))} · CR{" "}
                      {formatStat("CRIT_RATE", statOf(l, "CRIT_RATE"))} · CD{" "}
                      {formatStat("CRIT_DMG", statOf(l, "CRIT_DMG"))}
                    </span>
                  </div>
                  <div className="saved-actions">
                    <Link className="mini" to={`/character/${l.characterId}?loadout=${l.id}`}>
                      open
                    </Link>
                    <button className="mini" onClick={() => dupL.mutate(l.id)}>
                      duplicate
                    </button>
                    <button className="mini danger" onClick={() => delL.mutate(l.id)}>
                      delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No saved loadouts yet — build one on a character page and click Save.</p>
          )}
        </Card>

        <Card title={`Teams (${teamsQ.data?.length ?? 0})`}>
          {teamsQ.data?.length ? (
            <ul className="saved-list">
              {teamsQ.data.map((t) => (
                <li key={t.id}>
                  <div className="saved-info">
                    <span className="saved-name">{t.name}</span>
                    <span className="muted small">
                      {t.slots.map((s) => nameById(s.characterId)).join(", ") || "empty"}
                    </span>
                    {t.synergy.resonances.length ? (
                      <span className="muted small">{t.synergy.resonances.map((r) => r.name).join(", ")}</span>
                    ) : null}
                  </div>
                  <div className="saved-actions">
                    <button className="mini" onClick={() => dupT.mutate(t.id)}>
                      duplicate
                    </button>
                    <button className="mini danger" onClick={() => delT.mutate(t.id)}>
                      delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No saved teams yet — build one on the Team page and click Save.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
