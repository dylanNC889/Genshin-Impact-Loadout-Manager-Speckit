/**
 * Per-character damage assumptions on the character page (batch 7 #6) — the reaction and enemy
 * you're tuning the build against. Stored per character because the answer genuinely differs:
 * Hu Tao is read on Vaporize, Ganyu on Melt, a Physical carry on neither. Re-picking on every
 * visit would make the controls a chore rather than a feature.
 */
const KEY = "glm.damagePrefs";

export interface DamagePrefs {
  /** Key into REACTIONS ("none", "vaporize-2", …). */
  reaction: string;
  /** Index into ENEMY_PRESETS; 0 = Custom, which uses enemyLevel/enemyRes. */
  enemyPreset: number;
  enemyLevel: number;
  enemyRes: number;
}

export const DEFAULT_DAMAGE_PREFS: DamagePrefs = {
  reaction: "none",
  enemyPreset: 1, // Standard — Lv 90, 10% RES, matching the figures the page showed before.
  enemyLevel: 90,
  enemyRes: 10,
};

function readAll(): Record<string, DamagePrefs> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, DamagePrefs>;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function getDamagePrefs(characterId: string): DamagePrefs {
  // Spread over the defaults so a stored object written by an older build can't leave a field
  // undefined and turn a damage figure into NaN.
  return { ...DEFAULT_DAMAGE_PREFS, ...(readAll()[characterId] ?? {}) };
}

export function setDamagePrefs(characterId: string, prefs: DamagePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [characterId]: prefs }));
  } catch {
    /* storage unavailable (private mode / quota) — the choice just won't persist */
  }
}
