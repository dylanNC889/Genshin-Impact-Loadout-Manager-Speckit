import type { ArtifactSet, ArtifactSlot, StatKey } from "@app/contracts";
import type { OwnedArtifact } from "@app/optimizer";

/** GOOD (Genshin Open Object Description) stat keys → our StatKeys. */
const STAT_MAP: Record<string, StatKey> = {
  hp: "HP",
  hp_: "HP_PCT",
  atk: "ATK",
  atk_: "ATK_PCT",
  def: "DEF",
  def_: "DEF_PCT",
  eleMas: "EM",
  enerRech_: "ER",
  critRate_: "CRIT_RATE",
  critDMG_: "CRIT_DMG",
  heal_: "HEAL_BONUS",
  physical_dmg_: "PHYS_DMG",
  pyro_dmg_: "PYRO_DMG",
  hydro_dmg_: "HYDRO_DMG",
  electro_dmg_: "ELECTRO_DMG",
  cryo_dmg_: "CRYO_DMG",
  anemo_dmg_: "ANEMO_DMG",
  geo_dmg_: "GEO_DMG",
  dendro_dmg_: "DENDRO_DMG",
};

const SLOT_MAP: Record<string, ArtifactSlot> = {
  flower: "Flower",
  plume: "Plume",
  sands: "Sands",
  goblet: "Goblet",
  circlet: "Circlet",
};

/** Normalize a set name/key for fuzzy matching (drops spaces, apostrophes, case). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface GoodArtifact {
  setKey?: string;
  slotKey?: string;
  mainStatKey?: string;
  substats?: { key?: string; value?: number }[];
}

export interface ImportResult {
  artifacts: OwnedArtifact[];
  imported: number;
  skipped: number;
}

/**
 * Parse a GOOD-format inventory export into our OwnedArtifact shape. GOOD omits main-stat
 * values (derived from level/rarity), so we use the canonical max main-stat value.
 */
export function parseGOOD(text: string, sets: ArtifactSet[], mainStatValues: Partial<Record<StatKey, number>>): ImportResult {
  const data = JSON.parse(text) as { artifacts?: GoodArtifact[] };
  const raw = Array.isArray(data.artifacts) ? data.artifacts : [];
  const setByNorm = new Map(sets.map((s) => [norm(s.name), s.id]));

  const artifacts: OwnedArtifact[] = [];
  let skipped = 0;
  raw.forEach((a, i) => {
    const slot = a.slotKey ? SLOT_MAP[a.slotKey] : undefined;
    const mainKey = a.mainStatKey ? STAT_MAP[a.mainStatKey] : undefined;
    const setId = setByNorm.get(norm(a.setKey ?? ""));
    if (!slot || !mainKey || !setId) {
      skipped++;
      return;
    }
    const subStats = (a.substats ?? [])
      .map((s) => ({ key: s.key ? STAT_MAP[s.key] : undefined, value: s.value ?? 0 }))
      .filter((s): s is { key: StatKey; value: number } => Boolean(s.key))
      .map((s) => ({ key: s.key, value: s.value, rollValues: [s.value] }));
    artifacts.push({
      id: `${a.slotKey}-${i}`,
      slot,
      setId,
      mainStat: { key: mainKey, value: mainStatValues[mainKey] ?? 0 },
      subStats,
    });
  });
  return { artifacts, imported: artifacts.length, skipped };
}

const KEY = "glm.inventory";

export function loadInventory(): OwnedArtifact[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OwnedArtifact[];
  } catch {
    return [];
  }
}

export function saveInventory(artifacts: OwnedArtifact[]): void {
  localStorage.setItem(KEY, JSON.stringify(artifacts));
}
