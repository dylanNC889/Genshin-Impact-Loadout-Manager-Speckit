import type { Character, DamageCalcOptions, Dataset } from "@app/contracts";
import { assessSynergy, computeBaseStats, computeFinalStats, estimateTeamDamage } from "@app/stat-engine";
import type { DamageMember } from "@app/stat-engine";
import type { LoadoutRecord, Store, TeamRecord } from "../db/store";

/** Attach computed final stats + active set bonuses to a saved loadout (FR-008). */
export function decorateLoadout(dataset: Dataset, record: LoadoutRecord) {
  try {
    const { stats, activeSetBonuses } = computeFinalStats(record, dataset);
    return { ...record, computedFinalStats: stats, activeSetBonuses };
  } catch {
    return { ...record, computedFinalStats: [], activeSetBonuses: [] };
  }
}

/** Attach a synergy assessment to a saved team (FR-013/14/15). */
export function decorateTeam(dataset: Dataset, record: TeamRecord) {
  const members = record.slots
    .map((s) => dataset.characters.find((c) => c.id === s.characterId))
    .filter((c): c is Character => Boolean(c))
    .map((c) => ({ element: c.element, roles: c.roles }));
  return { ...record, synergy: assessSynergy(members) };
}

/**
 * Server-side on-demand team damage estimate for a saved team (FR-016). When a slot has an
 * associated loadout (FR-017), the geared final stats are used; otherwise base stats.
 */
export function calcTeamDamage(
  dataset: Dataset,
  record: TeamRecord,
  options: Partial<DamageCalcOptions>,
  store?: Store,
) {
  const members: DamageMember[] = record.slots.flatMap((s) => {
    const c = dataset.characters.find((x) => x.id === s.characterId);
    if (!c) return [];

    // Geared: use the associated loadout's computed final stats (FR-017).
    if (s.loadoutId && store) {
      const loadout = store.getLoadout(s.loadoutId);
      if (loadout) {
        try {
          const { stats } = computeFinalStats(loadout, dataset);
          const get = (k: string) => stats.find((st) => st.key === k)?.value ?? 0;
          const dmgBonusPct = stats
            .filter((st) => st.key.endsWith("_DMG"))
            .reduce((sum, st) => sum + st.value, 0);
          return [
            {
              characterId: c.id,
              finalATK: get("ATK"),
              critRate: get("CRIT_RATE"),
              critDmg: get("CRIT_DMG"),
              dmgBonusPct,
              talentMultiplier: 200,
              characterLevel: 90,
            },
          ];
        } catch {
          /* fall through to base stats */
        }
      }
    }

    const base = computeBaseStats(c, 90, 6, dataset.curves);
    const dmgBonusPct = Object.entries(base.sheet)
      .filter(([k]) => k.endsWith("_DMG"))
      .reduce((sum, [, v]) => sum + v, 0);
    return [
      {
        characterId: c.id,
        finalATK: base.baseATK,
        critRate: base.sheet.CRIT_RATE,
        critDmg: base.sheet.CRIT_DMG,
        dmgBonusPct,
        talentMultiplier: 200,
        characterLevel: 90,
      },
    ];
  });
  return estimateTeamDamage(members, options);
}
