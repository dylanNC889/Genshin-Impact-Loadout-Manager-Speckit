import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("GET /api/v1/weapons (T031 / FR-005)", () => {
  it("returns all weapons", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/weapons" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; weaponType: string }>;
    expect(body.some((w) => w.id === "staff-of-homa")).toBe(true);
  });

  it("filters by weapon type", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/weapons?weaponType=Sword" });
    const body = res.json() as Array<{ weaponType: string }>;
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((w) => w.weaponType === "Sword")).toBe(true);
  });
});

describe("GET /api/v1/artifact-sets (T031 / FR-009)", () => {
  it("returns sets with 2pc/4pc bonuses", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/artifact-sets" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; bonus2?: unknown }>;
    const crimson = body.find((s) => s.id === "crimson-witch-of-flames");
    expect(crimson).toBeDefined();
    expect(crimson?.bonus2).toBeDefined();
  });
});

describe("GET /api/v1/meta/rules (FR-007)", () => {
  it("exposes per-slot main stat rules", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/meta/rules" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { allowedMainStats: Record<string, string[]> };
    expect(body.allowedMainStats.Flower).toEqual(["HP"]);
    expect(body.allowedMainStats.Plume).toEqual(["ATK"]);
  });
});

describe("GET /api/v1/meta/stat-values (FR-022)", () => {
  it("exposes canonical main and substat values", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/meta/stat-values" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      mainStatValues: Record<string, number>;
      subStatValues: Record<string, number[]>;
    };
    expect(body.mainStatValues.HP).toBe(4780);
    expect(body.mainStatValues.CRIT_DMG).toBe(62.2);
    expect(body.subStatValues.CRIT_DMG).toContain(7.0);
  });
});
