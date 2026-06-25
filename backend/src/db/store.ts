import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { LoadoutInput, TeamInput } from "@app/contracts";

export interface LoadoutRecord extends LoadoutInput {
  id: string;
}
export interface TeamRecord extends TeamInput {
  id: string;
}

interface StoreData {
  loadouts: LoadoutRecord[];
  teams: TeamRecord[];
}

export interface Store {
  listLoadouts(): LoadoutRecord[];
  getLoadout(id: string): LoadoutRecord | undefined;
  createLoadout(input: LoadoutInput): LoadoutRecord;
  updateLoadout(id: string, input: LoadoutInput): LoadoutRecord | undefined;
  deleteLoadout(id: string): boolean;
  duplicateLoadout(id: string): LoadoutRecord | undefined;
  listTeams(): TeamRecord[];
  getTeam(id: string): TeamRecord | undefined;
  createTeam(input: TeamInput): TeamRecord;
  updateTeam(id: string, input: TeamInput): TeamRecord | undefined;
  deleteTeam(id: string): boolean;
  duplicateTeam(id: string): TeamRecord | undefined;
}

/**
 * A JSON-file-backed persistence store (Docker-free; no database required). State is loaded
 * from the file on construction and rewritten on each mutation — so a new store over the same
 * path restores all saved loadouts/teams across sessions (FR-019/020, SC-006).
 */
export class FileStore implements Store {
  private data: StoreData;

  constructor(private readonly path: string) {
    this.data = existsSync(path)
      ? (JSON.parse(readFileSync(path, "utf8")) as StoreData)
      : { loadouts: [], teams: [] };
  }

  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }

  listLoadouts(): LoadoutRecord[] {
    return this.data.loadouts;
  }
  getLoadout(id: string): LoadoutRecord | undefined {
    return this.data.loadouts.find((l) => l.id === id);
  }
  createLoadout(input: LoadoutInput): LoadoutRecord {
    const record: LoadoutRecord = { ...input, id: randomUUID() };
    this.data.loadouts.push(record);
    this.persist();
    return record;
  }
  updateLoadout(id: string, input: LoadoutInput): LoadoutRecord | undefined {
    const i = this.data.loadouts.findIndex((l) => l.id === id);
    if (i < 0) return undefined;
    const record: LoadoutRecord = { ...input, id };
    this.data.loadouts[i] = record;
    this.persist();
    return record;
  }
  deleteLoadout(id: string): boolean {
    const i = this.data.loadouts.findIndex((l) => l.id === id);
    if (i < 0) return false;
    this.data.loadouts.splice(i, 1);
    this.persist();
    return true;
  }
  duplicateLoadout(id: string): LoadoutRecord | undefined {
    const src = this.getLoadout(id);
    if (!src) return undefined;
    const record: LoadoutRecord = { ...src, id: randomUUID(), name: `${src.name} (copy)` };
    this.data.loadouts.push(record);
    this.persist();
    return record;
  }

  listTeams(): TeamRecord[] {
    return this.data.teams;
  }
  getTeam(id: string): TeamRecord | undefined {
    return this.data.teams.find((t) => t.id === id);
  }
  createTeam(input: TeamInput): TeamRecord {
    const record: TeamRecord = { ...input, id: randomUUID() };
    this.data.teams.push(record);
    this.persist();
    return record;
  }
  updateTeam(id: string, input: TeamInput): TeamRecord | undefined {
    const i = this.data.teams.findIndex((t) => t.id === id);
    if (i < 0) return undefined;
    const record: TeamRecord = { ...input, id };
    this.data.teams[i] = record;
    this.persist();
    return record;
  }
  deleteTeam(id: string): boolean {
    const i = this.data.teams.findIndex((t) => t.id === id);
    if (i < 0) return false;
    this.data.teams.splice(i, 1);
    this.persist();
    return true;
  }
  duplicateTeam(id: string): TeamRecord | undefined {
    const src = this.getTeam(id);
    if (!src) return undefined;
    const record: TeamRecord = { ...src, id: randomUUID(), name: `${src.name} (copy)` };
    this.data.teams.push(record);
    this.persist();
    return record;
  }
}
