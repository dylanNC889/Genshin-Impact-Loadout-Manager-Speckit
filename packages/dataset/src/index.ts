import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  ArtifactSetSchema,
  CharacterSchema,
  DatasetMetaSchema,
  FoodSchema,
  SlotStatRulesSchema,
  StatValuesTableSchema,
  WeaponSchema,
} from "@app/contracts";
import type {
  AscensionPhase,
  Character,
  Dataset,
  Element,
  Food,
  GrowthCurve,
  Role,
  StatKey,
  StatValue,
  TalentType,
  WeaponType,
} from "@app/contracts";

/**
 * Loads the reference dataset from `data/<version>/` JSON, normalizes the compact authored
 * character shape into full `Character` records, and validates everything against the
 * `@app/contracts` Zod schemas (FR-021 / task T014). Throws a descriptive ZodError if any
 * record is malformed.
 *
 * The dataset is the full live roster imported from genshin-db (see scripts/import.mts,
 * SC-008): 116 characters / 225 weapons / 44 sets, with accurate per-level base stats
 * (Lv 1–90 via level anchors + interpolation) and ascension stats. Duplicate ids are dropped.
 */

/** Compact authored character shape (see data/<version>/characters.json). */
interface RawCharacter {
  id: string;
  name: string;
  element: Element;
  weaponType: WeaponType;
  rarity: number;
  icon?: string;
  lv90: { hp: number; atk: number; def: number };
  ascensionStat: StatValue;
  levels?: { level: number; hp: number; atk: number; def: number; ascensionStat: number }[];
  roles: Role[];
  skills: {
    type: TalentType;
    name: string;
    icon?: string;
    desc?: string;
    scaling?: { label: string; valuesByLevel: number[]; percent: boolean }[];
  }[];
  constellations?: { level: number; name: string; icon?: string; description?: string }[];
  title?: string;
  description?: string;
  affiliation?: string;
  region?: string;
  constellation?: string;
  cv?: string;
  version?: string;
  ascensionMaterials?: { name: string; count: number }[];
  talentMaterials?: { name: string; count: number }[];
  splashArt?: string;
}

interface MetaFile {
  meta: { gameVersion: string; datasetVersion: string; generatedAt: string };
  curves: Record<string, GrowthCurve>;
  slotStatRules: unknown;
  statValues: unknown;
}

const here = dirname(fileURLToPath(import.meta.url));
/** packages/dataset/src -> repo root. */
const REPO_ROOT = join(here, "..", "..", "..");
/** Full accurate dataset imported from genshin-db (see scripts/import.mts). */
export const DEFAULT_DATASET_DIR = join(REPO_ROOT, "data", "genshindb");

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ramp the dedicated ascension stat across the 6 phases (full value at phase 6). */
function buildAscensions(stat: StatValue): AscensionPhase[] {
  const factors = [0, 0, 0.3, 0.5, 0.75, 1];
  return factors.map((f) => ({
    hpAdd: 0,
    atkAdd: 0,
    defAdd: 0,
    ascensionStat: { key: stat.key, value: round2(stat.value * f) },
  }));
}

function normalizeCharacter(raw: RawCharacter): Character {
  const candidate = {
    id: raw.id,
    name: raw.name,
    element: raw.element,
    weaponType: raw.weaponType,
    rarity: raw.rarity,
    icon: raw.icon ?? "",
    baseStats: { baseHP: raw.lv90.hp, baseATK: raw.lv90.atk, baseDEF: raw.lv90.def },
    growthCurveId: "endgame",
    ascensions: buildAscensions(raw.ascensionStat),
    levels: raw.levels ?? [],
    roles: raw.roles,
    skills: raw.skills.map((s) => ({
      id: slug(s.name),
      type: s.type,
      name: s.name,
      icon: s.icon ?? "",
      description: s.desc ?? "",
      scaling: s.scaling ?? [],
    })),
    constellations: raw.constellations ?? [],
    title: raw.title ?? "",
    description: raw.description ?? "",
    affiliation: raw.affiliation ?? "",
    region: raw.region ?? "",
    constellation: raw.constellation ?? "",
    cv: raw.cv ?? "",
    version: raw.version ?? "",
    ascensionMaterials: raw.ascensionMaterials ?? [],
    talentMaterials: raw.talentMaterials ?? [],
    splashArt: raw.splashArt ?? "",
  };
  // Validate the assembled record against the contract (single source of truth).
  return CharacterSchema.parse(candidate);
}

function readJson(dir: string, file: string): unknown {
  return JSON.parse(readFileSync(join(dir, file), "utf8"));
}

/** Load a version-independent modifier table (A1); drops non-object keys like `_note`. */
function readModifierTable(file: string): Record<string, Record<string, StatValue[]>> {
  try {
    const raw = JSON.parse(readFileSync(join(REPO_ROOT, "data", "modifiers", file), "utf8")) as Record<string, unknown>;
    const out: Record<string, Record<string, StatValue[]>> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && !Array.isArray(v)) out[k] = v as Record<string, StatValue[]>;
    }
    return out;
  } catch {
    return {};
  }
}

/** Drop entries with a duplicate id, keeping the first — guards against source data that
 * lists the same entry more than once (e.g. genshin-db's story-variant weapons). */
function dedupeById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export function loadDatasetFromDir(dir: string): Dataset {
  const metaFile = readJson(dir, "meta.json") as MetaFile;
  const rawCharacters = readJson(dir, "characters.json") as RawCharacter[];

  const characters = dedupeById(rawCharacters.map(normalizeCharacter));
  const weapons = dedupeById(z.array(WeaponSchema).parse(readJson(dir, "weapons.json")));
  const artifactSets = dedupeById(z.array(ArtifactSetSchema).parse(readJson(dir, "artifact-sets.json")));
  const slotStatRules = SlotStatRulesSchema.parse(metaFile.slotStatRules);
  const statValues = StatValuesTableSchema.parse(metaFile.statValues);
  const meta = DatasetMetaSchema.parse(metaFile.meta);
  const constellationBonuses = readModifierTable("constellations.json");
  const weaponRefinements = readModifierTable("weapon-refinements.json");
  let foods: Food[] = [];
  try {
    foods = dedupeById(z.array(FoodSchema).parse(readJson(dir, "foods.json")));
  } catch {
    foods = []; // older datasets without foods.json
  }

  return {
    meta,
    curves: metaFile.curves,
    characters,
    weapons,
    artifactSets,
    slotStatRules,
    statValues,
    constellationBonuses,
    weaponRefinements,
    foods,
  };
}

export function loadBundledDataset(): Dataset {
  return loadDatasetFromDir(DEFAULT_DATASET_DIR);
}

export type { Character, Dataset, StatKey };
