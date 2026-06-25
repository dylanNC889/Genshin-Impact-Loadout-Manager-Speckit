import type {
  ActiveSetBonus,
  ArtifactSet,
  Character,
  GrowthCurve,
  LoadoutInput,
  SlotStatRules,
  StatValue,
  StatValuesTable,
  SynergyAssessment,
  TeamInput,
  Weapon,
} from "@app/contracts";

export interface SavedLoadout extends LoadoutInput {
  id: string;
  computedFinalStats: StatValue[];
  activeSetBonuses: ActiveSetBonus[];
}

export interface SavedTeam extends TeamInput {
  id: string;
  synergy: SynergyAssessment;
}

export interface CharacterSummary {
  id: string;
  name: string;
  element: string;
  weaponType: string;
  rarity: number;
}

export interface CharacterDetail {
  character: Character;
  curves: Record<string, GrowthCurve>;
}

const BASE = "/api/v1";

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    /* ignore non-JSON error bodies */
  }
  return res.statusText;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

async function sendJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await errorMessage(res));
}

export function fetchCharacters(params: {
  q?: string;
  element?: string;
  weaponType?: string;
}): Promise<CharacterSummary[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.element) qs.set("element", params.element);
  if (params.weaponType) qs.set("weaponType", params.weaponType);
  return getJson(`${BASE}/characters?${qs.toString()}`);
}

export function fetchCharacterDetail(id: string): Promise<CharacterDetail> {
  return getJson(`${BASE}/characters/${id}`);
}

export function fetchWeapons(weaponType?: string): Promise<Weapon[]> {
  const qs = new URLSearchParams();
  if (weaponType) qs.set("weaponType", weaponType);
  return getJson(`${BASE}/weapons?${qs.toString()}`);
}

export function fetchArtifactSets(): Promise<ArtifactSet[]> {
  return getJson(`${BASE}/artifact-sets`);
}

export function fetchRules(): Promise<SlotStatRules> {
  return getJson(`${BASE}/meta/rules`);
}

export function fetchStatValues(): Promise<StatValuesTable> {
  return getJson(`${BASE}/meta/stat-values`);
}

// --- Saved loadouts (FR-018) ---
export function listLoadouts(): Promise<SavedLoadout[]> {
  return getJson(`${BASE}/loadouts`);
}
export function getLoadout(id: string): Promise<SavedLoadout> {
  return getJson(`${BASE}/loadouts/${id}`);
}
export function createLoadout(input: LoadoutInput): Promise<SavedLoadout> {
  return sendJson("POST", `${BASE}/loadouts`, input);
}
export function updateLoadout(id: string, input: LoadoutInput): Promise<SavedLoadout> {
  return sendJson("PUT", `${BASE}/loadouts/${id}`, input);
}
export function duplicateLoadout(id: string): Promise<SavedLoadout> {
  return sendJson("POST", `${BASE}/loadouts/${id}/duplicate`);
}
export function deleteLoadout(id: string): Promise<void> {
  return del(`${BASE}/loadouts/${id}`);
}

// --- Saved teams (FR-019) ---
export function listTeams(): Promise<SavedTeam[]> {
  return getJson(`${BASE}/teams`);
}
export function getTeam(id: string): Promise<SavedTeam> {
  return getJson(`${BASE}/teams/${id}`);
}
export function createTeam(input: TeamInput): Promise<SavedTeam> {
  return sendJson("POST", `${BASE}/teams`, input);
}
export function updateTeam(id: string, input: TeamInput): Promise<SavedTeam> {
  return sendJson("PUT", `${BASE}/teams/${id}`, input);
}
export function duplicateTeam(id: string): Promise<SavedTeam> {
  return sendJson("POST", `${BASE}/teams/${id}/duplicate`);
}
export function deleteTeam(id: string): Promise<void> {
  return del(`${BASE}/teams/${id}`);
}
