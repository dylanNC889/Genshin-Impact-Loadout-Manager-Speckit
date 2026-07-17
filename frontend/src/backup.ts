import type { OwnedArtifact } from "@app/optimizer";
import { listLoadouts, listTeams, createLoadout, createTeam, type SavedLoadout, type SavedTeam } from "./api";
import { getFavorites, setFavorites } from "./favorites";
import { loadInventory, saveInventory } from "./inventory";

const FORMAT = "glm-backup";
const VERSION = 1;

/** A portable snapshot of everything the user has saved locally. */
export interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  loadouts: SavedLoadout[];
  teams: SavedTeam[];
  favorites: string[];
  inventory: OwnedArtifact[];
}

/** Gather all saved data into a backup object (works in both HTTP and static modes). */
export async function exportBackup(): Promise<Backup> {
  const [loadouts, teams] = await Promise.all([listLoadouts(), listTeams()]);
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    loadouts,
    teams,
    favorites: [...getFavorites()],
    inventory: loadInventory(),
  };
}

export interface ImportSummary {
  loadouts: number;
  teams: number;
  favorites: number;
  inventory: number;
}

/**
 * Restore a backup. Loadouts/teams are re-created (fresh ids) — a merge, not a clobber; favourites
 * are unioned with existing; inventory replaces the current one when present.
 */
export async function importBackup(raw: unknown): Promise<ImportSummary> {
  const data = raw as Partial<Backup> | null;
  if (!data || data.format !== FORMAT || !Array.isArray(data.loadouts)) {
    throw new Error("This doesn't look like a Genshin Loadout Manager backup file.");
  }
  const loadouts = data.loadouts;
  const teams = Array.isArray(data.teams) ? data.teams : [];
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  const inventory = Array.isArray(data.inventory) ? (data.inventory as OwnedArtifact[]) : [];

  for (const lo of loadouts) await createLoadout(lo);
  for (const t of teams) await createTeam(t);
  setFavorites([...getFavorites(), ...favorites]);
  if (inventory.length) saveInventory(inventory);

  return { loadouts: loadouts.length, teams: teams.length, favorites: favorites.length, inventory: inventory.length };
}
