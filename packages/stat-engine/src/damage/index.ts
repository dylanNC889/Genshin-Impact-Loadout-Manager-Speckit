import type { DamageCalcOptions, DamageEstimate } from "@app/contracts";

/** Per-character inputs for the on-demand quantitative estimate (FR-016, research D5). */
export interface DamageMember {
  characterId: string;
  finalATK: number;
  /** percent points */
  critRate: number;
  /** percent points */
  critDmg: number;
  /** percent points of DMG bonus (elemental/phys) */
  dmgBonusPct: number;
  /** talent scaling as a percent (e.g., 400 = 400% of ATK) */
  talentMultiplier: number;
  reactionMultiplier?: number;
  reactionType?: string;
  characterLevel?: number;
}

const DEFAULTS: DamageCalcOptions = {
  enemyLevel: 90,
  enemyResistancePct: 10,
  rotation: "v1-generic",
};

/**
 * On-demand team damage estimate using the v1 generic rotation (research D5). Pure and
 * deterministic. Returns per-character + total estimates together with the assumptions
 * used (FR-016) so the UI can display them. This is an estimate, not a guarantee.
 */
export function estimateTeamDamage(
  members: DamageMember[],
  options: Partial<DamageCalcOptions> = {},
): DamageEstimate {
  const opts: DamageCalcOptions = { ...DEFAULTS, ...options };
  const resFactor = 1 - opts.enemyResistancePct / 100;
  const reactionTypes = new Set<string>();

  const perCharacter = members.map((m) => {
    const charLevel = m.characterLevel ?? 90;
    const critRate = Math.min(Math.max(m.critRate, 0), 100) / 100;
    const avgCrit = 1 + critRate * (m.critDmg / 100);
    const dmgMult = 1 + m.dmgBonusPct / 100;
    const defFactor = (charLevel + 100) / (charLevel + 100 + (opts.enemyLevel + 100));
    const reaction = m.reactionMultiplier ?? 1;
    if (m.reactionType) reactionTypes.add(m.reactionType);
    const base = (m.talentMultiplier / 100) * m.finalATK;
    const estimated = base * dmgMult * avgCrit * defFactor * resFactor * reaction;
    return { characterId: m.characterId, estimated };
  });

  const totalEstimated = perCharacter.reduce((sum, p) => sum + p.estimated, 0);

  return {
    totalEstimated,
    perCharacter,
    assumptions: {
      enemyLevel: opts.enemyLevel,
      enemyResistancePct: opts.enemyResistancePct,
      rotation: opts.rotation,
      reactionTypes: [...reactionTypes],
    },
  };
}
