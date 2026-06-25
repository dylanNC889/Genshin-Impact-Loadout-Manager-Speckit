import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { buildApp } from "../src/app";
import { FileStore } from "../src/db/store";

const storePath = join(tmpdir(), `glm-store-${randomUUID()}.json`);

const loadoutBody = {
  name: "My Hu Tao",
  characterId: "hu-tao",
  level: 90,
  ascensionPhase: 6,
  weaponId: "staff-of-homa",
  artifacts: [
    { slot: "Goblet", setId: "crimson-witch-of-flames", mainStat: { key: "PYRO_DMG", value: 46.6 }, subStats: [] },
  ],
};
const teamBody = { name: "Vape", slots: [{ characterId: "hu-tao" }, { characterId: "xingqiu" }] };

let loadoutId = "";
let teamId = "";

afterAll(() => {
  if (existsSync(storePath)) rmSync(storePath);
});

// --- Session 1: create + validate ---------------------------------------------------------
describe("US4 session 1 — create (T046/T047)", () => {
  let app: ReturnType<typeof buildApp>;
  beforeAll(async () => {
    app = buildApp({ store: new FileStore(storePath) });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("creates a loadout with computed final stats", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/loadouts", payload: loadoutBody });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { id: string; computedFinalStats: Array<{ key: string; value: number }> };
    expect(body.id).toBeTruthy();
    expect(body.computedFinalStats.length).toBeGreaterThan(0);
    loadoutId = body.id;
  });

  it("rejects an invalid loadout with a 422 envelope", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/loadouts", payload: { name: "bad", level: 90, ascensionPhase: 6 } });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { code: string }).code).toBe("VALIDATION_ERROR");
  });

  it("creates a team with a derived synergy assessment", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/teams", payload: teamBody });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { id: string; synergy: { possibleReactions: string[] } };
    expect(body.synergy.possibleReactions).toContain("Vaporize");
    teamId = body.id;
  });
});

// --- Session 2: a fresh store over the same file restores everything (SC-006) --------------
describe("US4 session 2 — reopen across sessions, duplicate, delete (T048)", () => {
  let app: ReturnType<typeof buildApp>;
  beforeAll(async () => {
    app = buildApp({ store: new FileStore(storePath) });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("restores the saved loadout intact in a new session", async () => {
    const res = await app.inject({ method: "GET", url: `/api/v1/loadouts/${loadoutId}` });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { name: string }).name).toBe("My Hu Tao");
  });

  it("restores the saved team", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/teams" });
    const body = res.json() as Array<{ id: string }>;
    expect(body.some((t) => t.id === teamId)).toBe(true);
  });

  it("duplicates a loadout into an independent copy", async () => {
    const dup = await app.inject({ method: "POST", url: `/api/v1/loadouts/${loadoutId}/duplicate` });
    expect(dup.statusCode).toBe(201);
    const copy = dup.json() as { id: string; name: string };
    expect(copy.id).not.toBe(loadoutId);
    expect(copy.name).toContain("(copy)");

    // Editing the copy must not affect the original.
    await app.inject({ method: "PUT", url: `/api/v1/loadouts/${copy.id}`, payload: { ...loadoutBody, name: "Renamed copy" } });
    const original = await app.inject({ method: "GET", url: `/api/v1/loadouts/${loadoutId}` });
    expect((original.json() as { name: string }).name).toBe("My Hu Tao");
  });

  it("runs the server-side on-demand calculation for a saved team (FR-016)", async () => {
    const res = await app.inject({ method: "POST", url: `/api/v1/teams/${teamId}/calculate`, payload: {} });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { totalEstimated: number; assumptions: { rotation: string } };
    expect(body.totalEstimated).toBeGreaterThan(0);
    expect(body.assumptions.rotation).toBe("v1-generic");
  });

  it("deletes a loadout (404 afterwards)", async () => {
    const del = await app.inject({ method: "DELETE", url: `/api/v1/loadouts/${loadoutId}` });
    expect(del.statusCode).toBe(204);
    const gone = await app.inject({ method: "GET", url: `/api/v1/loadouts/${loadoutId}` });
    expect(gone.statusCode).toBe(404);
  });
});
