import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { computeBaseSheet, statRecord } from "@app/stat-engine";
import type { CharacterDetail } from "../types";
import type { SavedLoadout } from "../api";
import { fetchCharacters, fetchCharacterDetail, fetchWeapons, fetchArtifactSets, listLoadouts } from "../api";
import { Card } from "../components/ui";
import { statLabel, formatStat } from "../format";
import { RECOMMENDATIONS } from "../data/recommendations";

/** Stat keys shown in the numeric comparison, in display order. */
const STAT_KEYS = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"] as const;
const PERCENTISH = (key: string) =>
  ["CRIT_RATE", "CRIT_DMG", "ER", "HEAL_BONUS"].includes(key) || key.endsWith("_PCT") || key.endsWith("_DMG");

/** Lv 90 base sheet (no gear) as a flat record. */
function baseRecord(detail: CharacterDetail | undefined): Record<string, number> | null {
  if (!detail) return null;
  return statRecord(computeBaseSheet(detail.character, 90, 6, detail.curves));
}

/** A saved build's final stats as a flat record. */
function buildRecord(loadout: SavedLoadout | undefined): Record<string, number> | null {
  if (!loadout) return null;
  return Object.fromEntries(loadout.computedFinalStats.map((s) => [s.key, s.value]));
}

/** Compare two characters — meta, base or geared stats, and top KQM picks (B8 + build compare). */
export function CharacterComparePage() {
  const [params, setParams] = useSearchParams();
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const roster = (rosterQ.data ?? []).slice().sort((x, y) => x.name.localeCompare(y.name));
  const loadouts = loadoutsQ.data ?? [];

  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const ba = params.get("ba") ?? ""; // selected build id for side A ("" = base stats)
  const bb = params.get("bb") ?? "";
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Changing a character clears its build selection (the old build belongs to another character).
    if (key === "a") next.delete("ba");
    if (key === "b") next.delete("bb");
    setParams(next, { replace: true });
  };

  const detailA = useQuery({ queryKey: ["character", a], queryFn: () => fetchCharacterDetail(a), enabled: Boolean(a) });
  const detailB = useQuery({ queryKey: ["character", b], queryFn: () => fetchCharacterDetail(b), enabled: Boolean(b) });
  const cA = detailA.data?.character;
  const cB = detailB.data?.character;

  const buildA = loadouts.find((l) => l.id === ba);
  const buildB = loadouts.find((l) => l.id === bb);
  const recA = (ba && buildRecord(buildA)) || baseRecord(detailA.data);
  const recB = (bb && buildRecord(buildB)) || baseRecord(detailB.data);

  const weaponName = (id?: string) => weaponsQ.data?.find((w) => w.id === id)?.name ?? id ?? "—";
  const setName = (id?: string) => setsQ.data?.find((s) => s.id === id)?.name ?? id ?? "—";
  const topWeapon = (id: string) => weaponName(RECOMMENDATIONS[id]?.weapons[0]);
  const topSet = (id: string) => setName(RECOMMENDATIONS[id]?.sets[0]);

  const picker = (side: "a" | "b", value: string) => (
    <select value={value} onChange={(e) => setParam(side, e.target.value)} aria-label={`Character ${side.toUpperCase()}`}>
      <option value="">— pick a character —</option>
      {roster.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  const buildPicker = (side: "a" | "b", charId: string, value: string) => {
    const builds = loadouts.filter((l) => l.characterId === charId);
    if (!builds.length) return <span className="muted small">No saved builds</span>;
    return (
      <select
        value={value}
        onChange={(e) => setParam(side === "a" ? "ba" : "bb", e.target.value)}
        aria-label={`Build for character ${side.toUpperCase()}`}
      >
        <option value="">Base stats (Lv 90)</option>
        {builds.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name || "Untitled build"}
          </option>
        ))}
      </select>
    );
  };

  const textRow = (label: string, x: string, y: string) => (
    <tr>
      <td>{label}</td>
      <td>{x}</td>
      <td>{y}</td>
      <td>—</td>
    </tr>
  );
  // Stat-aware row: formats each value and the delta per the stat's unit (% vs flat).
  const statRow = (key: string, x: number, y: number, label = statLabel(key)) => {
    const d = y - x;
    const pct = PERCENTISH(key);
    const sig = pct ? 0.05 : 0.5;
    const deltaStr =
      Math.abs(d) < sig ? "—" : `${d > 0 ? "+" : ""}${pct ? `${d.toFixed(1)}%` : Math.round(d).toLocaleString()}`;
    return (
      <tr key={label}>
        <td>{label}</td>
        <td>{formatStat(key, x)}</td>
        <td>{formatStat(key, y)}</td>
        <td className={`delta ${d > sig ? "up" : d < -sig ? "down" : ""}`}>{deltaStr}</td>
      </tr>
    );
  };

  return (
    <div className="compare">
      <h1>Compare characters</h1>
      <div className="compare-pickers">
        {picker("a", a)}
        <span className="muted">vs</span>
        {picker("b", b)}
      </div>

      {cA && cB && recA && recB ? (
        <>
          <div className="compare-build-pickers">
            <div>{buildPicker("a", cA.id, ba)}</div>
            <span className="muted small">compare builds</span>
            <div>{buildPicker("b", cB.id, bb)}</div>
          </div>

          <Card title="Comparison">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>{cA.name}</th>
                  <th>{cB.name}</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {textRow("Rarity", `${cA.rarity}★`, `${cB.rarity}★`)}
                {textRow("Element", cA.element, cB.element)}
                {textRow("Weapon", cA.weaponType, cB.weaponType)}
                {textRow("Region", cA.region || "—", cB.region || "—")}
                {textRow("Roles", cA.roles.join(", ") || "—", cB.roles.join(", ") || "—")}
                {textRow(
                  "Stats from",
                  ba && buildA ? buildA.name || "Build" : "Base Lv 90",
                  bb && buildB ? buildB.name || "Build" : "Base Lv 90",
                )}
                {STAT_KEYS.map((key) => statRow(key, recA[key] ?? 0, recB[key] ?? 0))}
                {/* Each character's own elemental DMG bonus (from ascension/goblet). */}
                {statRow(
                  `${cA.element.toUpperCase()}_DMG`,
                  recA[`${cA.element.toUpperCase()}_DMG`] ?? 0,
                  recB[`${cB.element.toUpperCase()}_DMG`] ?? 0,
                  "Elemental DMG Bonus",
                )}
                {(recA.HEAL_BONUS ?? 0) || (recB.HEAL_BONUS ?? 0)
                  ? statRow("HEAL_BONUS", recA.HEAL_BONUS ?? 0, recB.HEAL_BONUS ?? 0)
                  : null}
                {textRow("Top weapon (KQM)", topWeapon(cA.id), topWeapon(cB.id))}
                {textRow("Top set (KQM)", topSet(cA.id), topSet(cB.id))}
              </tbody>
            </table>
            <p className="muted small stat-foot">
              Base stats are Lv 90 with no gear. Pick a saved build per side to compare final geared stats.
            </p>
          </Card>
        </>
      ) : (
        <p className="muted small">Pick two characters above to compare them.</p>
      )}
    </div>
  );
}
