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
import { Card, Icon } from "../components/ui";
import { formatStat } from "../format";
import { exportBackup, importBackup } from "../backup";
import { useRef, useState } from "react";

export function SavedPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  async function onExport() {
    const data = await exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `glm-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg(`Exported ${data.loadouts.length} loadouts, ${data.teams.length} teams.`);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const summary = await importBackup(JSON.parse(await file.text()));
      await qc.invalidateQueries({ queryKey: ["loadouts"] });
      await qc.invalidateQueries({ queryKey: ["teams"] });
      setBackupMsg(`Imported ${summary.loadouts} loadouts, ${summary.teams} teams, ${summary.favorites} favourites.`);
    } catch (err) {
      setBackupMsg(`Import failed: ${(err as Error).message}`);
    }
  }
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const rosterQ = useQuery({ queryKey: ["characters", "saved"], queryFn: () => fetchCharacters({}) });

  const nameById = (id: string) => rosterQ.data?.find((c) => c.id === id)?.name ?? id;
  const iconById = (id: string) => rosterQ.data?.find((c) => c.id === id)?.icon;
  const statOf = (l: SavedLoadout, key: string) =>
    l.computedFinalStats.find((s) => s.key === key)?.value ?? 0;

  const dupL = useMutation({ mutationFn: duplicateLoadout, onSuccess: () => qc.invalidateQueries({ queryKey: ["loadouts"] }) });
  const delL = useMutation({ mutationFn: deleteLoadout, onSuccess: () => qc.invalidateQueries({ queryKey: ["loadouts"] }) });
  const dupT = useMutation({ mutationFn: duplicateTeam, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
  const delT = useMutation({ mutationFn: deleteTeam, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });

  return (
    <div className="saved">
      <div className="saved-head">
        <h1>Saved</h1>
        <div className="row-gap">
          <button className="btn" onClick={onExport}>
            Export data
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import data
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImportFile} aria-label="Import backup file" />
          {backupMsg ? <span className="muted small">{backupMsg}</span> : null}
        </div>
      </div>
      <div className="saved-grid">
        <Card title={`Loadouts (${loadoutsQ.data?.length ?? 0})`}>
          {loadoutsQ.data?.length ? (
            <ul className="saved-list">
              {loadoutsQ.data.map((l) => (
                <li key={l.id}>
                  <div className="saved-left">
                    <Icon src={iconById(l.characterId)} alt="" size={36} />
                    <div className="saved-info">
                      <span className="saved-name">{l.name}</span>
                    <span className="muted small">
                      {nameById(l.characterId)} · ATK {Math.round(statOf(l, "ATK"))} · CR{" "}
                      {formatStat("CRIT_RATE", statOf(l, "CRIT_RATE"))} · CD{" "}
                      {formatStat("CRIT_DMG", statOf(l, "CRIT_DMG"))}
                    </span>
                    </div>
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
                    <Link className="mini" to={`/team?team=${t.id}`}>
                      open
                    </Link>
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
