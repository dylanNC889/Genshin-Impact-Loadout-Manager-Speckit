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
  /** Optional per-instance rotation (NA/Skill/Burst); if given, overrides talentMultiplier. */
  instances?: { label: string; multiplier: number }[];
  reactionMultiplier?: number;
  reactionType?: string;
  /** A transformative reaction this member triggers (Overloaded/Superconduct/…) — separate DMG. */
  transformative?: string;
  /** Elemental Mastery — powers the amplifying- and transformative-reaction EM bonuses. */
  em?: number;
  characterLevel?: number;
}

/** Standard transformative-reaction coefficients (base DMG = coeff · levelBase · emBonus · res). */
export const TRANSFORMATIVE_COEFF: Record<string, number> = {
  Overloaded: 2.0,
  "Electro-Charged": 1.2,
  Superconduct: 0.5,
  Swirl: 0.6,
  Shattered: 1.5,
  Bloom: 2.0,
  Hyperbloom: 3.0,
  Burgeon: 3.0,
  Burning: 0.25,
};

/** Transformative-reaction level base multiplier (anchor levels; keyed by character level). */
const TRANSFORMATIVE_LEVEL_BASE: Record<number, number> = {
  1: 17.17,
  20: 80.58,
  40: 214.36,
  60: 494.13,
  70: 690.29,
  80: 959.66,
  90: 1446.85,
};
const transLevelBase = (level: number): number => TRANSFORMATIVE_LEVEL_BASE[level] ?? 1446.85;

/** Transformative-reaction EM bonus: 1 + 16·EM/(EM+2000). */
export function transformativeEmBonus(em: number): number {
  const e = Math.max(em, 0);
  return 1 + (16 * e) / (e + 2000);
}

/** Amplifying-reaction EM bonus: 1 + 2.78·EM/(EM+1400) (Vaporize/Melt). */
export function emReactionBonus(em: number): number {
  const e = Math.max(em, 0);
  return 1 + (2.78 * e) / (e + 1400);
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
    // Amplifying reactions scale with the triggerer's EM (A3).
    const reaction = m.reactionMultiplier ? m.reactionMultiplier * emReactionBonus(m.em ?? 0) : 1;
    if (m.reactionType) reactionTypes.add(m.reactionType);
    const common = dmgMult * avgCrit * defFactor * resFactor * reaction;
    // Per-instance rotation (A4) when provided, else a single generic-rotation instance.
    const rotation = m.instances?.length ? m.instances : [{ label: "Rotation", multiplier: m.talentMultiplier }];
    const instances = rotation.map((ins) => ({
      label: ins.label,
      estimated: (ins.multiplier / 100) * m.finalATK * common,
    }));
    // Transformative reactions (A6): flat DMG that doesn't crit and ignores DEF/DMG% — its own line.
    const transCoeff = m.transformative ? TRANSFORMATIVE_COEFF[m.transformative] : undefined;
    if (transCoeff) {
      const transDmg = transCoeff * transLevelBase(charLevel) * transformativeEmBonus(m.em ?? 0) * resFactor;
      instances.push({ label: m.transformative as string, estimated: transDmg });
    }
    const estimated = instances.reduce((sum, ins) => sum + ins.estimated, 0);
    return { characterId: m.characterId, estimated, instances };
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

/**
 * Average (crit-weighted) damage of a single talent instance — same pipeline as
 * estimateTeamDamage, but with an explicit scaling stat value (ATK/HP/DEF) so non-ATK
 * scalers work. Used for the per-talent "≈ damage" figures on the character page (A7).
 */
export function instanceAvgDamage(p: {
  /** Talent scaling as a percent of the scaling stat (e.g. 400 = 400%). */
  multiplier: number;
  /** The final value of the scaling stat (ATK / Max HP / DEF). */
  statValue: number;
  critRate: number;
  critDmg: number;
  dmgBonusPct: number;
  charLevel?: number;
  enemyLevel?: number;
  enemyResistancePct?: number;
}): number {
  const charLevel = p.charLevel ?? 90;
  const enemyLevel = p.enemyLevel ?? 90;
  const resFactor = 1 - (p.enemyResistancePct ?? 10) / 100;
  const critRate = Math.min(Math.max(p.critRate, 0), 100) / 100;
  const avgCrit = 1 + critRate * (p.critDmg / 100);
  const dmgMult = 1 + p.dmgBonusPct / 100;
  const defFactor = (charLevel + 100) / (charLevel + 100 + (enemyLevel + 100));
  return (p.multiplier / 100) * p.statValue * dmgMult * avgCrit * defFactor * resFactor;
}
