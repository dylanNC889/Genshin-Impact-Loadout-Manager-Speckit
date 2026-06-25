import type { Character, GrowthCurve, StatValue } from "@app/contracts";
import { emptyStatMap, add, toStatValues } from "./stat-map";
import type { StatMap } from "./stat-map";

export interface BaseStats {
  /** White base HP/ATK/DEF (level growth + cumulative ascension flat adds). */
  baseHP: number;
  baseATK: number;
  baseDEF: number;
  /** Additive sheet stats: universal base + ascension dedicated stat (EM/CRIT/ER/etc.). */
  sheet: StatMap;
}

/**
 * Compute a character's base stats at a given level + ascension phase (research D1).
 * The level-growth curve provides a per-level multiplier of the level-1 base; ascension
 * phases add cumulative flat HP/ATK/DEF and a dedicated ascension stat.
 */
export function computeBaseStats(
  character: Character,
  level: number,
  ascensionPhase: number,
  curves: Record<string, GrowthCurve>,
): BaseStats {
  const curve = curves[character.growthCurveId];
  if (!curve) throw new Error(`Unknown growth curve: ${character.growthCurveId}`);
  const factor = curve[String(level)];
  if (factor === undefined) {
    throw new Error(`Growth curve '${character.growthCurveId}' has no entry for level ${level}`);
  }
  if (ascensionPhase < 0 || ascensionPhase > 6) {
    throw new Error(`ascensionPhase out of range (0-6): ${ascensionPhase}`);
  }
  const asc = ascensionPhase > 0 ? character.ascensions[ascensionPhase - 1] : undefined;

  let baseHP = character.baseStats.baseHP * factor + (asc?.hpAdd ?? 0);
  let baseATK = character.baseStats.baseATK * factor + (asc?.atkAdd ?? 0);
  let baseDEF = character.baseStats.baseDEF * factor + (asc?.defAdd ?? 0);

  const sheet = emptyStatMap();
  // Universal base values shared by every character.
  sheet.CRIT_RATE = 5;
  sheet.CRIT_DMG = 50;
  sheet.ER = 100;

  if (asc) {
    const { key, value } = asc.ascensionStat;
    if (key === "HP") baseHP += value;
    else if (key === "ATK") baseATK += value;
    else if (key === "DEF") baseDEF += value;
    else add(sheet, key, value);
  }

  return { baseHP, baseATK, baseDEF, sheet };
}

/** The displayed base character sheet (no gear) as StatValue[] (FR-002). */
export function computeBaseSheet(
  character: Character,
  level: number,
  ascensionPhase: number,
  curves: Record<string, GrowthCurve>,
): StatValue[] {
  const b = computeBaseStats(character, level, ascensionPhase, curves);
  const sheet: StatMap = { ...b.sheet };
  sheet.HP = b.baseHP;
  sheet.ATK = b.baseATK;
  sheet.DEF = b.baseDEF;
  return toStatValues(sheet);
}
