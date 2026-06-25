import type { ActiveSetBonus, Dataset, LoadoutInput, StatKey, StatValue } from "@app/contracts";
import { computeBaseStats } from "./base-stats";
import { toStatValues } from "./stat-map";
import type { StatMap } from "./stat-map";

export interface FinalStatsResult {
  stats: StatValue[];
  activeSetBonuses: ActiveSetBonus[];
}

interface Pools {
  flatHP: number;
  hpPct: number;
  flatATK: number;
  atkPct: number;
  flatDEF: number;
  defPct: number;
  direct: StatMap;
}

/** Route a stat contribution into the correct aggregation pool (research D2). */
function route(pools: Pools, key: StatKey, value: number): void {
  switch (key) {
    case "HP":
      pools.flatHP += value;
      break;
    case "HP_PCT":
      pools.hpPct += value;
      break;
    case "ATK":
      pools.flatATK += value;
      break;
    case "ATK_PCT":
      pools.atkPct += value;
      break;
    case "DEF":
      pools.flatDEF += value;
      break;
    case "DEF_PCT":
      pools.defPct += value;
      break;
    default:
      pools.direct[key] += value;
  }
}

/**
 * Compute final effective stats for a loadout (FR-008/009/010/011).
 * Aggregation order (D2): base -> flat additions -> percentage bonuses (% applies to
 * base, with ATK% applying to character base ATK + weapon base ATK) -> direct stats.
 * Partial loadouts (missing weapon/slots) compute without error (FR-011).
 */
export function computeFinalStats(input: LoadoutInput, dataset: Dataset): FinalStatsResult {
  const character = dataset.characters.find((c) => c.id === input.characterId);
  if (!character) throw new Error(`Unknown character: ${input.characterId}`);

  const base = computeBaseStats(character, input.level, input.ascensionPhase, dataset.curves);
  const pools: Pools = {
    flatHP: 0,
    hpPct: 0,
    flatATK: 0,
    atkPct: 0,
    flatDEF: 0,
    defPct: 0,
    direct: { ...base.sheet },
  };

  let weaponBaseATK = 0;
  if (input.weaponId) {
    const weapon = dataset.weapons.find((w) => w.id === input.weaponId);
    if (!weapon) throw new Error(`Unknown weapon: ${input.weaponId}`);
    if (weapon.weaponType !== character.weaponType) {
      throw new Error(
        `Weapon ${weapon.id} (${weapon.weaponType}) cannot be equipped on ${character.id} (${character.weaponType}).`,
      );
    }
    weaponBaseATK = weapon.baseATK;
    if (weapon.secondaryStat) route(pools, weapon.secondaryStat.key, weapon.secondaryStat.value);
    for (const b of weapon.passiveStatBonuses) route(pools, b.key, b.value);
  }

  // Artifacts + set-piece counting.
  const setCounts = new Map<string, number>();
  for (const art of input.artifacts) {
    route(pools, art.mainStat.key, art.mainStat.value);
    for (const s of art.subStats) route(pools, s.key, s.value);
    setCounts.set(art.setId, (setCounts.get(art.setId) ?? 0) + 1);
  }

  // Active set bonuses (2pc at >=2, 4pc at >=4).
  const activeSetBonuses: ActiveSetBonus[] = [];
  for (const [setId, count] of setCounts) {
    const set = dataset.artifactSets.find((s) => s.id === setId);
    if (!set) continue;
    if (count >= 2 && set.bonus2) {
      activeSetBonuses.push({ setId, pieces: 2 });
      for (const b of set.bonus2.statBonuses) route(pools, b.key, b.value);
    }
    if (count >= 4 && set.bonus4) {
      activeSetBonuses.push({ setId, pieces: 4 });
      for (const b of set.bonus4.statBonuses) route(pools, b.key, b.value);
    }
  }

  const finalHP = base.baseHP * (1 + pools.hpPct / 100) + pools.flatHP;
  const finalATK = (base.baseATK + weaponBaseATK) * (1 + pools.atkPct / 100) + pools.flatATK;
  const finalDEF = base.baseDEF * (1 + pools.defPct / 100) + pools.flatDEF;

  const out: StatMap = { ...pools.direct };
  out.HP = finalHP;
  out.ATK = finalATK;
  out.DEF = finalDEF;

  return { stats: toStatValues(out), activeSetBonuses };
}
