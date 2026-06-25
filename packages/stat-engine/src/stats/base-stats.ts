import type { Character, GrowthCurve, LevelStat, StatValue } from "@app/contracts";
import { emptyStatMap, add, toStatValues } from "./stat-map";
import type { StatMap } from "./stat-map";

/** Standard selectable level anchors (ascension caps) for the level picker (FR-003). */
export const LEVEL_ANCHORS = [1, 20, 40, 50, 60, 70, 80, 90] as const;

/** Look up (or linearly interpolate) base stats at a level from a character's level table. */
function lookupLevel(levels: LevelStat[], target: number): LevelStat {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) throw new Error("character has no level anchors");
  if (target <= first.level) return first;
  if (target >= last.level) return last;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (lo && hi && lo.level <= target && target <= hi.level) {
      if (target === lo.level) return lo;
      if (target === hi.level) return hi;
      const t = (target - lo.level) / (hi.level - lo.level);
      const lerp = (a: number, b: number) => a + t * (b - a);
      // Snap the ascension stat to the lower anchor (it steps at ascensions, not smoothly).
      return {
        level: target,
        hp: lerp(lo.hp, hi.hp),
        atk: lerp(lo.atk, hi.atk),
        def: lerp(lo.def, hi.def),
        ascensionStat: lo.ascensionStat,
      };
    }
  }
  return last;
}

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
  // Preferred path: explicit per-level base-stat anchors (FR-003), supporting any level 1-90.
  if (character.levels && character.levels.length > 0) {
    const lv = lookupLevel(character.levels, level);
    const sheet = emptyStatMap();
    sheet.CRIT_RATE = 5;
    sheet.CRIT_DMG = 50;
    sheet.ER = 100;
    let baseHP = lv.hp;
    let baseATK = lv.atk;
    let baseDEF = lv.def;
    const key = character.ascensions[character.ascensions.length - 1]?.ascensionStat.key;
    if (key === "HP") baseHP += lv.ascensionStat;
    else if (key === "ATK") baseATK += lv.ascensionStat;
    else if (key === "DEF") baseDEF += lv.ascensionStat;
    else if (key) add(sheet, key, lv.ascensionStat);
    return { baseHP, baseATK, baseDEF, sheet };
  }

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
