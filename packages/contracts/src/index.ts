import { z } from "zod";

/**
 * Shared contracts: enums, dataset shapes, calculation inputs/outputs, and the
 * actionable error envelope. This package is the single source of truth for both
 * the backend (Fastify/Prisma) and the frontend, and backs the `stat-engine`.
 *
 * Zod schemas are provided for the IO-validated and accuracy-critical shapes;
 * types are inferred from them so client and server cannot drift.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const ELEMENTS = [
  "Pyro",
  "Hydro",
  "Electro",
  "Cryo",
  "Anemo",
  "Geo",
  "Dendro",
] as const;
export const ElementSchema = z.enum(ELEMENTS);
export type Element = z.infer<typeof ElementSchema>;

export const WEAPON_TYPES = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"] as const;
export const WeaponTypeSchema = z.enum(WEAPON_TYPES);
export type WeaponType = z.infer<typeof WeaponTypeSchema>;

export const ARTIFACT_SLOTS = ["Flower", "Plume", "Sands", "Goblet", "Circlet"] as const;
export const ArtifactSlotSchema = z.enum(ARTIFACT_SLOTS);
export type ArtifactSlot = z.infer<typeof ArtifactSlotSchema>;

export const STAT_KEYS = [
  "HP",
  "HP_PCT",
  "ATK",
  "ATK_PCT",
  "DEF",
  "DEF_PCT",
  "EM",
  "CRIT_RATE",
  "CRIT_DMG",
  "ER",
  "HEAL_BONUS",
  "PYRO_DMG",
  "HYDRO_DMG",
  "ELECTRO_DMG",
  "CRYO_DMG",
  "ANEMO_DMG",
  "GEO_DMG",
  "DENDRO_DMG",
  "PHYS_DMG",
] as const;
export const StatKeySchema = z.enum(STAT_KEYS);
export type StatKey = z.infer<typeof StatKeySchema>;

export const TALENT_TYPES = [
  "NormalAttack",
  "ElementalSkill",
  "ElementalBurst",
  "Passive",
] as const;
export const TalentTypeSchema = z.enum(TALENT_TYPES);
export type TalentType = z.infer<typeof TalentTypeSchema>;

export const ROLES = [
  "MainDPS",
  "SubDPS",
  "Healer",
  "Shielder",
  "Buffer",
  "Battery",
] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const RaritySchema = z.union([z.literal(4), z.literal(5)]);
export type Rarity = z.infer<typeof RaritySchema>;

// ---------------------------------------------------------------------------
// Core value shapes
// ---------------------------------------------------------------------------

export const StatValueSchema = z.object({
  key: StatKeySchema,
  value: z.number(),
});
export type StatValue = z.infer<typeof StatValueSchema>;

/** Actionable error envelope (Constitution Principle III). */
export const ErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  remedy: z.string().optional(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Reference dataset shapes
// ---------------------------------------------------------------------------

export const AscensionPhaseSchema = z.object({
  /** Cumulative flat additions reached at this ascension phase (1..6). */
  hpAdd: z.number(),
  atkAdd: z.number(),
  defAdd: z.number(),
  /** Cumulative dedicated ascension stat at this phase. */
  ascensionStat: StatValueSchema,
});
export type AscensionPhase = z.infer<typeof AscensionPhaseSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  type: TalentTypeSchema,
  name: z.string(),
  description: z.string().default(""),
  /** Scaling values per talent level (1..N); each entry is a labeled multiplier (FR-004). */
  scaling: z
    .array(z.object({ label: z.string(), valuesByLevel: z.array(z.number()), percent: z.boolean().default(false) }))
    .default([]),
});
export type Skill = z.infer<typeof SkillSchema>;

/** Base stats at a specific level anchor (FR-003). `ascensionStat` is the dedicated stat value. */
export const LevelStatSchema = z.object({
  level: z.number().int(),
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  ascensionStat: z.number(),
});
export type LevelStat = z.infer<typeof LevelStatSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  element: ElementSchema,
  weaponType: WeaponTypeSchema,
  rarity: RaritySchema,
  /** Level-1 base values. */
  baseStats: z.object({ baseHP: z.number(), baseATK: z.number(), baseDEF: z.number() }),
  /** Named level-growth curve id; resolved against Dataset.curves. */
  growthCurveId: z.string(),
  /** Six ascension phases (index 0 = phase 1 ... index 5 = phase 6). */
  ascensions: z.array(AscensionPhaseSchema).length(6),
  /** Optional base-stat anchors per level for FR-003 level support; preferred over curves. */
  levels: z.array(LevelStatSchema).default([]),
  roles: z.array(RoleSchema).default([]),
  skills: z.array(SkillSchema).default([]),
});
export type Character = z.infer<typeof CharacterSchema>;

export const WeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  weaponType: WeaponTypeSchema,
  rarity: RaritySchema,
  /** Base ATK at the weapon's max level (used by loadouts at endgame). */
  baseATK: z.number(),
  secondaryStat: StatValueSchema.optional(),
  passiveStatBonuses: z.array(StatValueSchema).default([]),
});
export type Weapon = z.infer<typeof WeaponSchema>;

export const ArtifactSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  bonus2: z.object({ description: z.string().default(""), statBonuses: z.array(StatValueSchema).default([]) }).optional(),
  bonus4: z.object({ description: z.string().default(""), statBonuses: z.array(StatValueSchema).default([]) }).optional(),
});
export type ArtifactSet = z.infer<typeof ArtifactSetSchema>;

export const SlotStatRulesSchema = z.object({
  allowedMainStats: z.record(ArtifactSlotSchema, z.array(StatKeySchema)),
  allowedSubStats: z.array(StatKeySchema),
});
export type SlotStatRules = z.infer<typeof SlotStatRulesSchema>;

/** Canonical equipment stat values (FR-022) — main stats and allowed substat rolls. */
export const StatValuesTableSchema = z.object({
  mainStatValues: z.record(StatKeySchema, z.number()),
  subStatValues: z.record(StatKeySchema, z.array(z.number())),
});
export type StatValuesTable = z.infer<typeof StatValuesTableSchema>;

export const DatasetMetaSchema = z.object({
  gameVersion: z.string(),
  datasetVersion: z.string(),
  generatedAt: z.string(),
});
export type DatasetMeta = z.infer<typeof DatasetMetaSchema>;

/** A growth curve maps a level (as a string key) to a multiplier of the level-1 base. */
export type GrowthCurve = Record<string, number>;

export interface Dataset {
  meta: DatasetMeta;
  curves: Record<string, GrowthCurve>;
  characters: Character[];
  weapons: Weapon[];
  artifactSets: ArtifactSet[];
  slotStatRules: SlotStatRules;
  /** Canonical equipment stat values for build dropdowns (FR-022). Optional for engine-only use. */
  statValues?: StatValuesTable;
}

// ---------------------------------------------------------------------------
// Loadout / artifact instance (user-entered)
// ---------------------------------------------------------------------------

export const ArtifactInstanceSchema = z.object({
  slot: ArtifactSlotSchema,
  setId: z.string(),
  mainStat: StatValueSchema,
  subStats: z.array(StatValueSchema).max(4).default([]),
});
export type ArtifactInstance = z.infer<typeof ArtifactInstanceSchema>;

export const LoadoutInputSchema = z.object({
  name: z.string().min(1),
  characterId: z.string(),
  level: z.number().int().min(1).max(90),
  ascensionPhase: z.number().int().min(0).max(6),
  weaponId: z.string().nullable().optional(),
  artifacts: z.array(ArtifactInstanceSchema).max(5).default([]),
});
export type LoadoutInput = z.infer<typeof LoadoutInputSchema>;

export const ActiveSetBonusSchema = z.object({
  setId: z.string(),
  pieces: z.union([z.literal(2), z.literal(4)]),
});
export type ActiveSetBonus = z.infer<typeof ActiveSetBonusSchema>;

// ---------------------------------------------------------------------------
// Team / synergy / damage
// ---------------------------------------------------------------------------

export const TeamSlotInputSchema = z.object({
  characterId: z.string(),
  loadoutId: z.string().nullable().optional(),
});
export type TeamSlotInput = z.infer<typeof TeamSlotInputSchema>;

export const TeamInputSchema = z.object({
  name: z.string().min(1),
  slots: z.array(TeamSlotInputSchema).max(4),
});
export type TeamInput = z.infer<typeof TeamInputSchema>;

export const SynergyAssessmentSchema = z.object({
  complete: z.boolean(),
  resonances: z.array(z.object({ name: z.string(), description: z.string() })),
  possibleReactions: z.array(z.string()),
  roleCoverage: z.object({
    covered: z.array(RoleSchema),
    gaps: z.array(z.string()),
  }),
  /** Scored/labeled rating derived from the qualitative signals (FR-015). */
  rating: z.object({ score: z.number(), grade: z.string() }),
  notes: z.array(z.string()),
});
export type SynergyAssessment = z.infer<typeof SynergyAssessmentSchema>;

export const DamageCalcOptionsSchema = z.object({
  enemyLevel: z.number().int().default(90),
  enemyResistancePct: z.number().default(10),
  rotation: z.string().default("v1-generic"),
});
export type DamageCalcOptions = z.infer<typeof DamageCalcOptionsSchema>;

export const DamageEstimateSchema = z.object({
  totalEstimated: z.number(),
  perCharacter: z.array(z.object({ characterId: z.string(), estimated: z.number() })),
  assumptions: z.object({
    enemyLevel: z.number(),
    enemyResistancePct: z.number(),
    rotation: z.string(),
    reactionTypes: z.array(z.string()),
  }),
});
export type DamageEstimate = z.infer<typeof DamageEstimateSchema>;
