import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Dataset } from "@app/contracts";
import type { OptimizeTarget, OptimizedBuild, OwnedArtifact } from "@app/optimizer";
import {
  fetchArtifactSets,
  fetchCharacterDetail,
  fetchCharacters,
  fetchModifiers,
  fetchStatValues,
  fetchWeapons,
} from "../api";
import { Card } from "../components/ui";
import { encodeShare } from "../share";
import { parseGOOD, loadInventory, saveInventory, type ImportResult } from "../inventory";
import { getOwned } from "../ownership";
import { formatStat } from "../format";

const TARGETS: { key: OptimizeTarget; label: string }[] = [
  { key: "CV", label: "Crit Value" },
  { key: "ATK", label: "Max ATK" },
  { key: "HP", label: "Max HP" },
  { key: "EM", label: "Elemental Mastery" },
  { key: "DEF", label: "Max DEF" },
];

const SUMMARY_KEYS = ["ATK", "HP", "CRIT_RATE", "CRIT_DMG", "EM"];

/** Artifact optimizer (B1): import a GOOD inventory, search for the best build, apply it. */
export function OptimizePage() {
  const navigate = useNavigate();
  const rosterQ = useQuery({ queryKey: ["characters"], queryFn: () => fetchCharacters({}) });
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const statValsQ = useQuery({ queryKey: ["stat-values"], queryFn: fetchStatValues });
  const modifiersQ = useQuery({ queryKey: ["modifiers"], queryFn: fetchModifiers });

  const [characterId, setCharacterId] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const owned = getOwned("characters");
  const [setId, setSetId] = useState("");
  const [weaponId, setWeaponId] = useState("");
  const [target, setTarget] = useState<OptimizeTarget>("CV");
  const [inventory, setInventory] = useState<OwnedArtifact[]>(() => loadInventory());
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [builds, setBuilds] = useState<OptimizedBuild[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailQ = useQuery({
    queryKey: ["character", characterId],
    queryFn: () => fetchCharacterDetail(characterId),
    enabled: Boolean(characterId),
  });
  const character = detailQ.data?.character;
  const weaponsQ = useQuery({
    queryKey: ["weapons", character?.weaponType],
    queryFn: () => fetchWeapons(character?.weaponType),
    enabled: Boolean(character),
  });

  const setCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of inventory) m.set(a.setId, (m.get(a.setId) ?? 0) + 1);
    return m;
  }, [inventory]);

  function onImport() {
    if (!setsQ.data || !statValsQ.data) return;
    try {
      const res: ImportResult = parseGOOD(importText, setsQ.data, statValsQ.data.mainStatValues);
      setInventory(res.artifacts);
      saveInventory(res.artifacts);
      setImportMsg(`Imported ${res.imported} artifacts${res.skipped ? ` (skipped ${res.skipped} unrecognized)` : ""}.`);
      setImportText("");
    } catch (e) {
      setImportMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  function onClear() {
    setInventory([]);
    saveInventory([]);
    setBuilds([]);
    setImportMsg("Inventory cleared.");
  }

  function onOptimize() {
    if (!character || !detailQ.data || !weaponsQ.data || !modifiersQ.data) return;
    setRunning(true);
    setError(null);
    setBuilds([]);
    const dataset: Dataset = {
      meta: { gameVersion: "client", datasetVersion: "client", generatedAt: "" },
      curves: detailQ.data.curves,
      characters: [character],
      weapons: weaponsQ.data,
      artifactSets: setsQ.data ?? [],
      slotStatRules: { allowedMainStats: {}, allowedSubStats: [] },
      constellationBonuses: modifiersQ.data.constellationBonuses,
      weaponRefinements: modifiersQ.data.weaponRefinements,
    };
    const worker = new Worker(new URL("../optimizer/worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ ok: boolean; builds?: OptimizedBuild[]; error?: string }>) => {
      if (e.data.ok) setBuilds(e.data.builds ?? []);
      else setError(e.data.error ?? "Optimization failed.");
      setRunning(false);
      worker.terminate();
    };
    worker.postMessage({
      inventory,
      dataset,
      query: { characterId, weaponId: weaponId || null, setId: setId || undefined, target, topN: 5 },
    });
  }

  function applyBuild(build: OptimizedBuild) {
    const code = encodeShare({
      level: 90,
      weaponId: weaponId || null,
      constellation: 0,
      refinement: 1,
      artifacts: build.artifacts.map(({ slot, setId: s, mainStat, subStats }) => ({ slot, setId: s, mainStat, subStats })),
    });
    navigate(`/character/${characterId}?build=${code}`);
  }

  const ready = Boolean(character && inventory.length >= 5);

  return (
    <div className="optimize">
      <h1>Artifact Optimizer</h1>
      <p className="muted small">
        Import your artifact inventory (GOOD format, e.g. from the Genshin Optimizer or an inventory scanner), then
        search it for the build that best maximises a target for a character.
      </p>

      <Card title="1 · Inventory">
        <p className="muted small">
          Paste a GOOD JSON export. Stored locally in your browser. {inventory.length} artifacts loaded.
        </p>
        <textarea
          className="good-input"
          placeholder='{ "format": "GOOD", "artifacts": [ … ] }'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          aria-label="GOOD inventory JSON"
        />
        <div className="row-gap">
          <button className="btn" onClick={onImport} disabled={!importText.trim() || !setsQ.data}>
            Import
          </button>
          <button className="btn ghost" onClick={onClear} disabled={!inventory.length}>
            Clear inventory
          </button>
          {importMsg ? <span className="muted small">{importMsg}</span> : null}
        </div>
      </Card>

      <Card title="2 · Target">
        <div className="opt-controls">
          <label>
            Character
            <select value={characterId} onChange={(e) => setCharacterId(e.target.value)} aria-label="Character">
              <option value="">— pick —</option>
              {(rosterQ.data ?? [])
                .filter((c) => !ownedOnly || owned.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <label className="saved-only-toggle">
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
                aria-label="Owned characters only"
              />
              Owned only ({owned.size})
            </label>
          </label>
          <label>
            Weapon
            <select value={weaponId} onChange={(e) => setWeaponId(e.target.value)} aria-label="Weapon" disabled={!character}>
              <option value="">— none —</option>
              {(weaponsQ.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Set (4pc)
            <select value={setId} onChange={(e) => setSetId(e.target.value)} aria-label="Set filter">
              <option value="">Any set</option>
              {[...setCounts.entries()]
                .filter(([, n]) => n >= 5)
                .map(([id]) => (
                  <option key={id} value={id}>
                    {setsQ.data?.find((s) => s.id === id)?.name ?? id}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Maximise
            <select value={target} onChange={(e) => setTarget(e.target.value as OptimizeTarget)} aria-label="Target">
              {TARGETS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row-gap">
          <button className="btn primary" onClick={onOptimize} disabled={!ready || running}>
            {running ? "Optimizing…" : "Optimize"}
          </button>
          {!ready ? <span className="muted small">Pick a character and import ≥5 artifacts.</span> : null}
          {error ? <span className="error small">{error}</span> : null}
        </div>
      </Card>

      {builds.length ? (
        <Card title="3 · Best builds">
          <ol className="opt-results">
            {builds.map((b, i) => (
              <li key={i}>
                <div className="opt-result-head">
                  <strong>
                    {TARGETS.find((t) => t.key === target)?.label}: {formatStat(target === "CV" ? "CRIT_DMG" : target, b.score)}
                  </strong>
                  <button className="btn small" onClick={() => applyBuild(b)}>
                    Apply
                  </button>
                </div>
                <div className="opt-result-stats muted small">
                  {SUMMARY_KEYS.map((k) => `${k.replace("_", " ")} ${formatStat(k, b.finalStats[k] ?? 0)}`).join(" · ")}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
