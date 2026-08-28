/**
 * Shared damage assumptions (batch 7 #6).
 *
 * The team builder has had reaction + enemy presets since batch 4, while the character page —
 * the view where a build is actually tuned — always assumed no reaction against a neutral
 * Lv90 / 10% RES enemy. So the app's most-used damage numbers were its least realistic. Rather
 * than a second copy of the presets drifting from the first, both pages read them from here.
 *
 * The enemy fieldset is identical in both, so it lives here as a component. The team builder
 * keeps its own reaction fieldset because it carries two extra controls the character page has
 * no use for (auto-detect and the transformative picker, which is a separate flat-damage line
 * rather than a multiplier on a hit).
 */

/** Enemy presets (A8): level + RES, optionally per-element. Index 0 = Custom (uses the inputs). */
export const ENEMY_PRESETS: {
  name: string;
  level: number | null;
  res: number | null;
  byElement?: Record<string, number>;
}[] = [
  { name: "Custom", level: null, res: null },
  { name: "Standard — Lv 90, 10% RES", level: 90, res: 10 },
  { name: "Abyss — Lv 100, 10% RES", level: 100, res: 10 },
  { name: "No resistance — 0%", level: 90, res: 0 },
  { name: "Pyro-resistant — +50% Pyro", level: 90, res: 10, byElement: { Pyro: 50 } },
  { name: "Hydro-resistant — +50% Hydro", level: 90, res: 10, byElement: { Hydro: 50 } },
  { name: "Electro-resistant — +50% Electro", level: 90, res: 10, byElement: { Electro: 50 } },
  { name: "Cryo-resistant — +50% Cryo", level: 90, res: 10, byElement: { Cryo: 50 } },
];

/** The level/RES a preset index resolves to, falling back to the custom inputs for index 0. */
export function resolveEnemy(
  presetIndex: number,
  customLevel: number,
  customRes: number,
): { level: number; res: number; byElement?: Record<string, number> } {
  const preset = ENEMY_PRESETS[presetIndex] ?? ENEMY_PRESETS[0]!;
  return {
    level: preset.level ?? customLevel,
    res: preset.res ?? customRes,
    byElement: preset.byElement,
  };
}

interface EnemyFieldsetProps {
  preset: number;
  onPreset: (i: number) => void;
  level: number;
  onLevel: (n: number) => void;
  res: number;
  onRes: (n: number) => void;
}

/** Preset + level + RES. The level/RES inputs are only live on "Custom". */
export function EnemyFieldset({ preset, onPreset, level, onLevel, res, onRes }: EnemyFieldsetProps) {
  return (
    <fieldset className="dmg-group">
      <legend>Enemy</legend>
      <label className="enemy-preset">
        <span>Preset</span>
        <select value={preset} onChange={(e) => onPreset(Number(e.target.value))} aria-label="Enemy preset">
          {ENEMY_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Level</span>
        <input
          type="number"
          min={1}
          max={110}
          value={level}
          onChange={(e) => onLevel(Number(e.target.value))}
          aria-label="Enemy level"
          disabled={preset !== 0}
        />
      </label>
      <label>
        <span>RES %</span>
        <input
          type="number"
          min={-100}
          max={90}
          value={res}
          onChange={(e) => onRes(Number(e.target.value))}
          aria-label="Enemy resistance percent"
          disabled={preset !== 0}
        />
      </label>
    </fieldset>
  );
}
