import type { ArtifactSet, Dataset, LoadoutInput, SlotStatRules, StatValuesTable, TeamInput, Weapon } from "@app/contracts";
import * as staticApi from "./static-api";
import type { CharacterDetail, CharacterSummary, SavedLoadout, SavedTeam } from "./types";

export type { CharacterDetail, CharacterSummary, SavedLoadout, SavedTeam } from "./types";

/** In the GitHub Pages build there is no backend — delegate to the static provider. */
const STATIC = import.meta.env.VITE_STATIC === true;

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
    // Only set the JSON content-type when there's a body — otherwise Fastify rejects an
    // empty body with 400 (this broke bodyless POSTs like /duplicate).
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as T;
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await errorMessage(res));
}

// --- Reference data ---
export function fetchCharacters(params: { q?: string; element?: string; weaponType?: string }): Promise<CharacterSummary[]> {
  if (STATIC) return staticApi.fetchCharacters(params);
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.element) qs.set("element", params.element);
  if (params.weaponType) qs.set("weaponType", params.weaponType);
  return getJson(`${BASE}/characters?${qs.toString()}`);
}

export function fetchCharacterDetail(id: string): Promise<CharacterDetail> {
  if (STATIC) return staticApi.fetchCharacterDetail(id);
  return getJson(`${BASE}/characters/${id}`);
}

export function fetchWeapons(weaponType?: string): Promise<Weapon[]> {
  if (STATIC) return staticApi.fetchWeapons(weaponType);
  const qs = new URLSearchParams();
  if (weaponType) qs.set("weaponType", weaponType);
  return getJson(`${BASE}/weapons?${qs.toString()}`);
}

export function fetchArtifactSets(): Promise<ArtifactSet[]> {
  if (STATIC) return staticApi.fetchArtifactSets();
  return getJson(`${BASE}/artifact-sets`);
}

export function fetchRules(): Promise<SlotStatRules> {
  if (STATIC) return staticApi.fetchRules();
  return getJson(`${BASE}/meta/rules`);
}

export function fetchStatValues(): Promise<StatValuesTable> {
  if (STATIC) return staticApi.fetchStatValues();
  return getJson(`${BASE}/meta/stat-values`);
}

export interface Modifiers {
  constellationBonuses: NonNullable<Dataset["constellationBonuses"]>;
  weaponRefinements: NonNullable<Dataset["weaponRefinements"]>;
}
export function fetchModifiers(): Promise<Modifiers> {
  if (STATIC) return staticApi.fetchModifiers();
  return getJson(`${BASE}/meta/modifiers`);
}

export function fetchFoods(): Promise<NonNullable<Dataset["foods"]>> {
  if (STATIC) return staticApi.fetchFoods();
  return getJson(`${BASE}/foods`);
}

// --- Saved loadouts (FR-018) ---
export function listLoadouts(): Promise<SavedLoadout[]> {
  if (STATIC) return staticApi.listLoadouts();
  return getJson(`${BASE}/loadouts`);
}
export function getLoadout(id: string): Promise<SavedLoadout> {
  if (STATIC) return staticApi.getLoadout(id);
  return getJson(`${BASE}/loadouts/${id}`);
}
export function createLoadout(input: LoadoutInput): Promise<SavedLoadout> {
  if (STATIC) return staticApi.createLoadout(input);
  return sendJson("POST", `${BASE}/loadouts`, input);
}
export function updateLoadout(id: string, input: LoadoutInput): Promise<SavedLoadout> {
  if (STATIC) return staticApi.updateLoadout(id, input);
  return sendJson("PUT", `${BASE}/loadouts/${id}`, input);
}
export function duplicateLoadout(id: string): Promise<SavedLoadout> {
  if (STATIC) return staticApi.duplicateLoadout(id);
  return sendJson("POST", `${BASE}/loadouts/${id}/duplicate`);
}
export function deleteLoadout(id: string): Promise<void> {
  if (STATIC) return staticApi.deleteLoadout(id);
  return del(`${BASE}/loadouts/${id}`);
}

// --- Saved teams (FR-019) ---
export function listTeams(): Promise<SavedTeam[]> {
  if (STATIC) return staticApi.listTeams();
  return getJson(`${BASE}/teams`);
}
export function getTeam(id: string): Promise<SavedTeam> {
  if (STATIC) return staticApi.getTeam(id);
  return getJson(`${BASE}/teams/${id}`);
}
export function createTeam(input: TeamInput): Promise<SavedTeam> {
  if (STATIC) return staticApi.createTeam(input);
  return sendJson("POST", `${BASE}/teams`, input);
}
export function updateTeam(id: string, input: TeamInput): Promise<SavedTeam> {
  if (STATIC) return staticApi.updateTeam(id, input);
  return sendJson("PUT", `${BASE}/teams/${id}`, input);
}
export function duplicateTeam(id: string): Promise<SavedTeam> {
  if (STATIC) return staticApi.duplicateTeam(id);
  return sendJson("POST", `${BASE}/teams/${id}/duplicate`);
}
export function deleteTeam(id: string): Promise<void> {
  if (STATIC) return staticApi.deleteTeam(id);
  return del(`${BASE}/teams/${id}`);
}
