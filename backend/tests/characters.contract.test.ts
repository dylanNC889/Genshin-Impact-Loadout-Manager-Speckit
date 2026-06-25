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

describe("GET /api/v1/characters (T020 / FR-001)", () => {
  it("returns the roster as summaries", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/characters" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ id: string; element: string }>;
    expect(body.length).toBeGreaterThanOrEqual(100);
    expect(body.some((c) => c.id === "hu-tao")).toBe(true);
    expect(body[0]).toHaveProperty("element");
  });

  it("filters by element", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/characters?element=Pyro" });
    const body = res.json() as Array<{ element: string }>;
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((c) => c.element === "Pyro")).toBe(true);
  });

  it("searches by name substring", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/characters?q=hu" });
    const body = res.json() as Array<{ id: string }>;
    expect(body.some((c) => c.id === "hu-tao")).toBe(true);
  });
});

describe("GET /api/v1/characters/:id (T020 / FR-002, FR-004)", () => {
  it("returns full detail plus the growth curve for client-side stats", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/characters/hu-tao" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { character: { id: string; skills: unknown[] }; curves: Record<string, unknown> };
    expect(body.character.id).toBe("hu-tao");
    expect(body.character.skills.length).toBeGreaterThan(0);
    expect(body.curves).toHaveProperty("endgame");
  });

  it("returns a 404 actionable error envelope for an unknown id (Principle III)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/characters/does-not-exist" });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { code: string; message: string; remedy: string };
    expect(body.code).toBe("CHARACTER_NOT_FOUND");
    expect(body.remedy).toContain("/api/v1/characters");
  });
});

describe("GET /api/v1/meta/dataset (T016 / FR-021)", () => {
  it("exposes the active dataset version", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/meta/dataset" });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { gameVersion: string }).gameVersion).toBe("genshin-db-5");
  });
});
