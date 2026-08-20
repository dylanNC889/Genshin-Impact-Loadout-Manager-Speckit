import type { DamageCalcOptions, DamageEstimate, TalentScope } from "@app/contracts";

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
  /** Optional per-instance rotation (NA/Skill/Burst); if given, overrides talentMultiplier.
   *  `scope` opts an instance into the matching per-hit DMG% from `talentDmgPct`. */
  instances?: { label: string; multiplier: number; scope?: TalentScope }[];
  /** Per-hit DMG% (percent points) by talent scope — from conditional buffs that buff only one
   *  talent ("+50% Charged Attack DMG"). Applied per instance, never to the sheet. */
  talentDmgPct?: Partial<Record<TalentScope, number>>;
  reactionMultiplier?: number;
  reactionType?: string;
  /** A transformative reaction this member triggers (Overloaded/Superconduct/…) — separate DMG. */
  transformative?: string;
  /** Elemental Mastery — powers the amplifying- and transformative-reaction EM bonuses. */
  em?: number;
  /** The member's element — for per-element enemy RES (A8). */
  element?: string;
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

/** Additive (catalyze) reaction coefficients — Aggravate/Spread add base DMG to the hit. */
export const CATALYZE_COEFF: Record<string, number> = {
  Aggravate: 1.15,
  Spread: 1.25,
};

/** Transformative-reaction EM bonus: 1 + 16·EM/(EM+2000). */
export function transformativeEmBonus(em: number): number {
  const e = Math.max(em, 0);
  return 1 + (16 * e) / (e + 2000);
}

/** Additive-reaction (Aggravate/Spread) EM bonus: 1 + 5·EM/(EM+1200). */
export function catalyzeEmBonus(em: number): number {
  const e = Math.max(em, 0);
  return 1 + (5 * e) / (e + 1200);
}

/** Amplifying-reaction EM bonus: 1 + 2.78·EM/(EM+1400) (Vaporize/Melt). */
export function emReactionBonus(em: number): number {
  const e = Math.max(em, 0);
  return 1 + (2.78 * e) / (e + 1400);
}

/**
 * Damage multiplier from an enemy's RES, as the game computes it — piecewise, not linear:
 *   RES >= 75%  ->  1 / (1 + 4·RES)   (heavy diminishing returns on very resistant targets)
 *   0..75%      ->  1 − RES
 *   RES < 0     ->  1 − RES/2         (shred past 0 is HALVED)
 * The negative branch matters now that RES shred can come from a build's own artifacts as well
 * as its teammates: a −30% effective RES is worth ×1.15, not the ×1.30 a linear form would give.
 */
export function resMultiplier(resPct: number): number {
  const res = resPct / 100;
  if (res < 0) return 1 - res / 2;
  if (res >= 0.75) return 1 / (1 + 4 * res);
  return 1 - res;
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
  // Per-element RES (A8): a member's element can override the uniform enemy RES.
  const resFactorFor = (element?: string) => {
    const perElement = element ? opts.enemyResistanceByElement?.[element] : undefined;
    return resMultiplier(perElement ?? opts.enemyResistancePct);
  };
  const reactionTypes = new Set<string>();

  const perCharacter = members.map((m) => {
    const charLevel = m.characterLevel ?? 90;
    const critRate = Math.min(Math.max(m.critRate, 0), 100) / 100;
    const avgCrit = 1 + critRate * (m.critDmg / 100);
    const dmgMult = 1 + m.dmgBonusPct / 100;
    const defFactor = (charLevel + 100) / (charLevel + 100 + (opts.enemyLevel + 100));
    const resFactor = resFactorFor(m.element);
    // Amplifying reactions scale with the triggerer's EM (A3).
    const reaction = m.reactionMultiplier ? m.reactionMultiplier * emReactionBonus(m.em ?? 0) : 1;
    if (m.reactionType) reactionTypes.add(m.reactionType);
    // Everything except the DMG% multiplier, which now varies per instance.
    const commonNoDmg = avgCrit * defFactor * resFactor * reaction;
    const common = dmgMult * commonNoDmg;
    // Per-instance rotation (A4) when provided, else a single generic-rotation instance.
    const rotation = m.instances?.length ? m.instances : [{ label: "Rotation", multiplier: m.talentMultiplier }];
    const instances = rotation.map((ins) => {
      // A scoped per-hit bonus ("+25% Elemental Skill DMG") adds to the DMG% multiplier for
      // THIS instance only — the whole reason it can't be folded into the sheet.
      const scoped = ins.scope ? (m.talentDmgPct?.[ins.scope] ?? 0) : 0;
      const insDmgMult = 1 + (m.dmgBonusPct + scoped) / 100;
      return {
        label: ins.label,
        estimated: (ins.multiplier / 100) * m.finalATK * insDmgMult * commonNoDmg,
      };
    });
    // Extra reactions (A6). Transformative = flat DMG, no crit, ignores DEF/DMG%. Catalyze
    // (Aggravate/Spread) adds base DMG to the hit, so it crits and takes DMG%/DEF/RES.
    if (m.transformative) {
      const transCoeff = TRANSFORMATIVE_COEFF[m.transformative];
      const catCoeff = CATALYZE_COEFF[m.transformative];
      if (transCoeff) {
        const transDmg = transCoeff * transLevelBase(charLevel) * transformativeEmBonus(m.em ?? 0) * resFactor;
        instances.push({ label: m.transformative, estimated: transDmg });
      } else if (catCoeff) {
        const additive = catCoeff * transLevelBase(charLevel) * catalyzeEmBonus(m.em ?? 0);
        instances.push({ label: m.transformative, estimated: additive * common });
      }
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
  /** Per-hit DMG% for this instance's talent only (e.g. Golden Troupe's +25% Skill DMG). Kept
   *  separate from dmgBonusPct so callers can't accidentally apply it to every hit. */
  talentDmgBonusPct?: number;
  charLevel?: number;
  enemyLevel?: number;
  enemyResistancePct?: number;
}): number {
  const charLevel = p.charLevel ?? 90;
  const enemyLevel = p.enemyLevel ?? 90;
  const resFactor = resMultiplier(p.enemyResistancePct ?? 10);
  const critRate = Math.min(Math.max(p.critRate, 0), 100) / 100;
  const avgCrit = 1 + critRate * (p.critDmg / 100);
  const dmgMult = 1 + (p.dmgBonusPct + (p.talentDmgBonusPct ?? 0)) / 100;
  const defFactor = (charLevel + 100) / (charLevel + 100 + (enemyLevel + 100));
  return (p.multiplier / 100) * p.statValue * dmgMult * avgCrit * defFactor * resFactor;
}
