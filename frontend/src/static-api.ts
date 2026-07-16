import type { Dataset, LoadoutInput, StatValuesTable, TeamInput, Weapon } from "@app/contracts";
import type { Character } from "@app/contracts";
import { assessSynergy, computeFinalStats } from "@app/stat-engine";
import type { CharacterDetail, CharacterSummary, SavedLoadout, SavedTeam } from "./types";

/**
 * Static (GitHub Pages) data provider: no backend. Reference data is read from a bundled
 * `dataset.json` (generated at build time from @app/dataset); loadouts/teams persist to
 * localStorage. Decoration (final stats, synergy) reuses the shared stat-engine.
 */

let cache: Dataset | null = null;
async function ds(): Promise<Dataset> {
  if (!cache) {
    const res = await fetch(`${import.meta.env.BASE_URL}dataset.json`);
    if (!res.ok) throw new Error("Failed to load bundled dataset.json");
    cache = (await res.json()) as Dataset;
  }
  return cache;
}

// --- Reference data ---
export async function fetchCharacters(params: {
  q?: string;
  element?: string;
  weaponType?: string;
}): Promise<CharacterSummary[]> {
  const d = await ds();
  const q = params.q?.trim().toLowerCase();
  return d.characters
    .filter((c) => (params.element ? c.element === params.element : true))
    .filter((c) => (params.weaponType ? c.weaponType === params.weaponType : true))
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

export async function fetchCharacterDetail(id: string): Promise<CharacterDetail> {
  const d = await ds();
  const character = d.characters.find((c) => c.id === id);
  if (!character) throw new Error(`No character with id '${id}'.`);
  const curve = d.curves[character.growthCurveId];
  const curves = curve ? { [character.growthCurveId]: curve } : {};
  return { character, curves };
}

export async function fetchWeapons(weaponType?: string): Promise<Weapon[]> {
  const d = await ds();
  return d.weapons.filter((w) => (weaponType ? w.weaponType === weaponType : true));
}

export async function fetchArtifactSets() {
  return (await ds()).artifactSets;
}

export async function fetchRules() {
  return (await ds()).slotStatRules;
}

export async function fetchStatValues(): Promise<StatValuesTable> {
  return (await ds()).statValues ?? { mainStatValues: {}, subStatValues: {} };
}

export async function fetchModifiers() {
  const d = await ds();
  return { constellationBonuses: d.constellationBonuses ?? {}, weaponRefinements: d.weaponRefinements ?? {} };
}

// --- localStorage persistence ---
type LoadoutRecord = LoadoutInput & { id: string };
type TeamRecord = TeamInput & { id: string };
const LKEY = "glm.loadouts";
const TKEY = "glm.teams";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function decorateLoadout(rec: LoadoutRecord): Promise<SavedLoadout> {
  const d = await ds();
  try {
    const { stats, activeSetBonuses } = computeFinalStats(rec, d);
    return { ...rec, computedFinalStats: stats, activeSetBonuses };
  } catch {
    return { ...rec, computedFinalStats: [], activeSetBonuses: [] };
  }
}

async function decorateTeam(rec: TeamRecord): Promise<SavedTeam> {
  const d = await ds();
  const members = rec.slots
    .map((s) => d.characters.find((c) => c.id === s.characterId))
    .filter((c): c is Character => Boolean(c))
    .map((c) => ({ element: c.element, roles: c.roles }));
  return { ...rec, synergy: assessSynergy(members) };
}

export async function listLoadouts(): Promise<SavedLoadout[]> {
  return Promise.all(read<LoadoutRecord>(LKEY).map(decorateLoadout));
}
export async function getLoadout(id: string): Promise<SavedLoadout> {
  const rec = read<LoadoutRecord>(LKEY).find((r) => r.id === id);
  if (!rec) throw new Error(`No loadout with id '${id}'.`);
  return decorateLoadout(rec);
}
export async function createLoadout(input: LoadoutInput): Promise<SavedLoadout> {
  const all = read<LoadoutRecord>(LKEY);
  const rec = { ...input, id: uid() };
  all.push(rec);
  write(LKEY, all);
  return decorateLoadout(rec);
}
export async function updateLoadout(id: string, input: LoadoutInput): Promise<SavedLoadout> {
  const all = read<LoadoutRecord>(LKEY);
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`No loadout with id '${id}'.`);
  const rec = { ...input, id };
  all[i] = rec;
  write(LKEY, all);
  return decorateLoadout(rec);
}
export async function duplicateLoadout(id: string): Promise<SavedLoadout> {
  const all = read<LoadoutRecord>(LKEY);
  const src = all.find((r) => r.id === id);
  if (!src) throw new Error(`No loadout with id '${id}'.`);
  const rec = { ...src, id: uid(), name: `${src.name} (copy)` };
  all.push(rec);
  write(LKEY, all);
  return decorateLoadout(rec);
}
export async function deleteLoadout(id: string): Promise<void> {
  write(LKEY, read<LoadoutRecord>(LKEY).filter((r) => r.id !== id));
}

export async function listTeams(): Promise<SavedTeam[]> {
  return Promise.all(read<TeamRecord>(TKEY).map(decorateTeam));
}
export async function getTeam(id: string): Promise<SavedTeam> {
  const rec = read<TeamRecord>(TKEY).find((r) => r.id === id);
  if (!rec) throw new Error(`No team with id '${id}'.`);
  return decorateTeam(rec);
}
export async function createTeam(input: TeamInput): Promise<SavedTeam> {
  const all = read<TeamRecord>(TKEY);
  const rec = { ...input, id: uid() };
  all.push(rec);
  write(TKEY, all);
  return decorateTeam(rec);
}
export async function updateTeam(id: string, input: TeamInput): Promise<SavedTeam> {
  const all = read<TeamRecord>(TKEY);
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) throw new Error(`No team with id '${id}'.`);
  const rec = { ...input, id };
  all[i] = rec;
  write(TKEY, all);
  return decorateTeam(rec);
}
export async function duplicateTeam(id: string): Promise<SavedTeam> {
  const all = read<TeamRecord>(TKEY);
  const src = all.find((r) => r.id === id);
  if (!src) throw new Error(`No team with id '${id}'.`);
  const rec = { ...src, id: uid(), name: `${src.name} (copy)` };
  all.push(rec);
  write(TKEY, all);
  return decorateTeam(rec);
}
export async function deleteTeam(id: string): Promise<void> {
  write(TKEY, read<TeamRecord>(TKEY).filter((r) => r.id !== id));
}
