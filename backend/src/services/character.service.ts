import type { Character, Dataset, GrowthCurve } from "@app/contracts";

export interface CharacterSummary {
  id: string;
  name: string;
  element: Character["element"];
  weaponType: Character["weaponType"];
  rarity: Character["rarity"];
  icon: string;
  region: string;
  /** Debut version (e.g. "1.3") — for signature weapon/set derivation. */
  version: string;
}

export interface CharacterDetail {
  character: Character;
  /** Growth curves the client needs to compute base stats locally (instant recalc). */
  curves: Record<string, GrowthCurve>;
}

export interface CharacterFilters {
  q?: string;
  element?: string;
  weaponType?: string;
}

/** List/search/filter the roster (FR-001). */
export function listCharacters(dataset: Dataset, filters: CharacterFilters = {}): CharacterSummary[] {
  const q = filters.q?.trim().toLowerCase();
  return dataset.characters
    .filter((c) => (filters.element ? c.element === filters.element : true))
    .filter((c) => (filters.weaponType ? c.weaponType === filters.weaponType : true))
    .filter((c) => (q ? c.name.toLowerCase().includes(q) || c.id.includes(q) : true))
    .map((c) => ({
      id: c.id,
      name: c.name,
      element: c.element,
      weaponType: c.weaponType,
      rarity: c.rarity,
      icon: c.icon,
      region: c.region,
      version: c.version,
    }));
}

/** Full character detail incl. skills, plus the curve needed for client-side stats (FR-002/004). */
export function getCharacterDetail(dataset: Dataset, id: string): CharacterDetail | undefined {
  const character = dataset.characters.find((c) => c.id === id);
  if (!character) return undefined;
  const curveId = character.growthCurveId;
  const curve = dataset.curves[curveId];
  const curves: Record<string, GrowthCurve> = curve ? { [curveId]: curve } : {};
  return { character, curves };
}
