import type {
  ArtifactSet,
  ArtifactSlot,
  Character,
  Dataset,
  GrowthCurve,
  LoadoutInput,
  SlotStatRules,
  StatKey,
  StatValuesTable,
  Weapon,
} from "@app/contracts";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { computeFinalStats, statRecord, validateArtifact } from "@app/stat-engine";
import { useLoadoutStore, type ArtifactDraft } from "../state/loadoutStore";
import { createLoadout, updateLoadout } from "../api";
import { Card, Icon, StatRow } from "./ui";
import { formatStat, statLabel } from "../format";

const SLOTS: ArtifactSlot[] = ["Flower", "Plume", "Sands", "Goblet", "Circlet"];
const FINAL_ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];

interface Props {
  character: Character;
  curves: Record<string, GrowthCurve>;
  weapons: Weapon[];
  artifactSets: ArtifactSet[];
  rules: SlotStatRules;
  statValues: StatValuesTable;
  level: number;
  /** When set, the editor was opened on an existing saved loadout (FR-018 edit). */
  editingLoadoutId?: string | null;
}

const ASCENSION_FOR_LEVEL: Record<number, number> = { 1: 0, 20: 1, 40: 2, 50: 3, 60: 4, 70: 5, 80: 6, 90: 6 };

export function LoadoutEditor({
  character,
  curves,
  weapons,
  artifactSets,
  rules,
  statValues,
  level,
  editingLoadoutId,
}: Props) {
  const weaponId = useLoadoutStore((s) => s.weaponId);
  const artifacts = useLoadoutStore((s) => s.artifacts);
  const setWeapon = useLoadoutStore((s) => s.setWeapon);
  const setArtifact = useLoadoutStore((s) => s.setArtifact);
  const clearArtifact = useLoadoutStore((s) => s.clearArtifact);

  // Assemble a client-side Dataset so computeFinalStats runs locally (instant recalc).
  const clientDataset: Dataset = {
    meta: { gameVersion: "client", datasetVersion: "client", generatedAt: "" },
    curves,
    characters: [character],
    weapons,
    artifactSets,
    slotStatRules: rules,
  };

  const loadout: LoadoutInput = {
    name: "editor",
    characterId: character.id,
    level,
    ascensionPhase: ASCENSION_FOR_LEVEL[level] ?? 6,
    weaponId,
    artifacts: SLOTS.flatMap((slot) => {
      const d = artifacts[slot];
      return d ? [{ slot, setId: d.setId, mainStat: d.mainStat, subStats: d.subStats }] : [];
    }),
  };

  let finalStats: Record<string, number> = {};
  let activeSetBonuses: { setId: string; pieces: number }[] = [];
  let computeError: string | null = null;
  try {
    const res = computeFinalStats(loadout, clientDataset);
    finalStats = statRecord(res.stats);
    activeSetBonuses = res.activeSetBonuses;
  } catch (e) {
    computeError = (e as Error).message;
  }

  const extraDmg = Object.entries(finalStats).filter(([k, v]) => k.endsWith("_DMG") && v !== 0);
  const setName = (id: string) => artifactSets.find((s) => s.id === id)?.name ?? id;

  const qc = useQueryClient();
  const [saveName, setSaveName] = useState("");
  const named = () => ({ ...loadout, name: saveName.trim() || `${character.name} build` });
  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ["loadouts"] });
    qc.invalidateQueries({ queryKey: ["saved-loadout"] });
  };
  const saveMut = useMutation({ mutationFn: () => createLoadout(named()), onSuccess: onSaved });
  const updateMut = useMutation({
    mutationFn: () => updateLoadout(editingLoadoutId ?? "", named()),
    onSuccess: onSaved,
  });

  return (
    <Card title="Loadout">
      <div className="loadout-grid">
        <div className="loadout-editor">
          <div className="field">
            <label htmlFor="weapon">Weapon ({character.weaponType})</label>
            <div className="picker-row">
              <Icon src={weapons.find((w) => w.id === weaponId)?.icon} alt="weapon" size={32} />
              <select id="weapon" value={weaponId ?? ""} onChange={(e) => setWeapon(e.target.value || null)}>
                <option value="">— none —</option>
                {weapons.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {SLOTS.map((slot) => (
            <ArtifactSlotEditor
              key={slot}
              slot={slot}
              draft={artifacts[slot]}
              sets={artifactSets}
              allowedMains={rules.allowedMainStats[slot] ?? []}
              allowedSubs={rules.allowedSubStats}
              mainStatValues={statValues.mainStatValues}
              subStatValues={statValues.subStatValues}
              rules={rules}
              onChange={(d) => (d ? setArtifact(slot, d) : clearArtifact(slot))}
            />
          ))}
        </div>

        <div className="final-stats">
          <h3>Final Stats</h3>
          {computeError ? <p className="error">{computeError}</p> : null}
          {FINAL_ORDER.map((k) => (
            <StatRow key={k} label={statLabel(k)} value={formatStat(k, finalStats[k] ?? 0)} />
          ))}
          {extraDmg.map(([k, v]) => (
            <StatRow key={k} label={statLabel(k)} value={formatStat(k, v)} />
          ))}
          <h4>Active set bonuses</h4>
          {activeSetBonuses.length === 0 ? (
            <p className="muted small">None — equip 2+ pieces of a set.</p>
          ) : (
            <ul className="set-bonuses">
              {activeSetBonuses.map((b) => (
                <li key={`${b.setId}-${b.pieces}`}>
                  {setName(b.setId)} · {b.pieces}-piece
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Recalculates instantly client-side via the stat-engine (FR-008/010).</p>
        </div>
      </div>
      <div className="save-bar">
        <input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={`${character.name} build`}
          aria-label="Loadout name"
        />
        {editingLoadoutId ? (
          <>
            <button className="calc-btn" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              Update loadout
            </button>
            <button className="mini" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              Save as new
            </button>
          </>
        ) : (
          <button className="calc-btn" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Save loadout
          </button>
        )}
        {saveMut.isSuccess ? <span className="saved-ok">Saved ✓</span> : null}
        {updateMut.isSuccess ? <span className="saved-ok">Updated ✓</span> : null}
        {saveMut.isError ? <span className="error">{(saveMut.error as Error).message}</span> : null}
        {updateMut.isError ? <span className="error">{(updateMut.error as Error).message}</span> : null}
      </div>
    </Card>
  );
}

interface SlotProps {
  slot: ArtifactSlot;
  draft: ArtifactDraft | undefined;
  sets: ArtifactSet[];
  allowedMains: StatKey[];
  allowedSubs: StatKey[];
  mainStatValues: StatValuesTable["mainStatValues"];
  subStatValues: StatValuesTable["subStatValues"];
  rules: SlotStatRules;
  onChange: (draft: ArtifactDraft | undefined) => void;
}

function ArtifactSlotEditor({
  slot,
  draft,
  sets,
  allowedMains,
  allowedSubs,
  mainStatValues,
  subStatValues,
  rules,
  onChange,
}: SlotProps) {
  const firstMain: StatKey = allowedMains[0] ?? "HP";
  const mainValue = (key: StatKey): number => mainStatValues[key] ?? 0;
  const firstSubValue = (key: StatKey): number => subStatValues[key]?.[0] ?? 0;

  function onSetChange(value: string) {
    if (!value) return onChange(undefined);
    if (!draft) {
      return onChange({ setId: value, mainStat: { key: firstMain, value: mainValue(firstMain) }, subStats: [] });
    }
    onChange({ ...draft, setId: value });
  }
  // Main stat value is fixed by the stat key (FR-022) — selecting the key sets the value.
  function onMainKey(key: StatKey) {
    if (draft) onChange({ ...draft, mainStat: { key, value: mainValue(key) } });
  }
  function addSub() {
    if (draft && draft.subStats.length < 4) {
      const key = allowedSubs[0] ?? "ATK_PCT";
      onChange({ ...draft, subStats: [...draft.subStats, { key, value: firstSubValue(key) }] });
    }
  }
  function onSubKey(i: number, key: StatKey) {
    if (!draft) return;
    onChange({
      ...draft,
      subStats: draft.subStats.map((s, idx) => (idx === i ? { key, value: firstSubValue(key) } : s)),
    });
  }
  function onSubValue(i: number, value: number) {
    if (!draft) return;
    onChange({ ...draft, subStats: draft.subStats.map((s, idx) => (idx === i ? { ...s, value } : s)) });
  }
  function removeSub(i: number) {
    if (draft) onChange({ ...draft, subStats: draft.subStats.filter((_, idx) => idx !== i) });
  }

  const errors = draft
    ? validateArtifact({ slot, setId: draft.setId, mainStat: draft.mainStat, subStats: draft.subStats }, rules).errors
    : [];

  return (
    <div className="slot">
      <div className="slot-head">
        <span className="slot-name">{slot}</span>
        <Icon src={sets.find((s) => s.id === draft?.setId)?.icon} alt="set" size={28} />
        <select value={draft?.setId ?? ""} onChange={(e) => onSetChange(e.target.value)} aria-label={`${slot} set`}>
          <option value="">— empty —</option>
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {draft ? (
        <div className="slot-body">
          <div className="main-row">
            <select value={draft.mainStat.key} onChange={(e) => onMainKey(e.target.value as StatKey)} aria-label={`${slot} main stat`}>
              {allowedMains.map((k) => (
                <option key={k} value={k}>
                  {statLabel(k)}
                </option>
              ))}
            </select>
            <span className="fixed-val" aria-label={`${slot} main value`}>
              {formatStat(draft.mainStat.key, draft.mainStat.value)}
            </span>
          </div>

          {draft.subStats.map((s, i) => (
            <div className="sub-row" key={i}>
              <select value={s.key} onChange={(e) => onSubKey(i, e.target.value as StatKey)} aria-label="substat">
                {allowedSubs.map((k) => (
                  <option key={k} value={k}>
                    {statLabel(k)}
                  </option>
                ))}
              </select>
              <select value={String(s.value)} onChange={(e) => onSubValue(i, Number(e.target.value))} aria-label="substat value">
                {(subStatValues[s.key] ?? []).map((v) => (
                  <option key={v} value={String(v)}>
                    {formatStat(s.key, v)}
                  </option>
                ))}
              </select>
              <button type="button" className="mini" onClick={() => removeSub(i)} aria-label="remove substat">
                ✕
              </button>
            </div>
          ))}
          {draft.subStats.length < 4 ? (
            <button type="button" className="mini add" onClick={addSub}>
              + substat
            </button>
          ) : null}

          {errors.length ? (
            <ul className="slot-errors">
              {errors.map((e, i) => (
                <li key={i}>
                  {e.message}
                  {e.remedy ? ` ${e.remedy}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
