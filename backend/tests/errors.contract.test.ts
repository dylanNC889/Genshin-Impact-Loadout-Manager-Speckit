import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { FileStore } from "../src/db/store";

const storePath = join(tmpdir(), `glm-errors-${randomUUID()}.json`);
let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp({ store: new FileStore(storePath) });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  if (existsSync(storePath)) rmSync(storePath);
});

/** Every error response must use the actionable envelope (Constitution Principle III). */
function expectEnvelope(body: unknown) {
  const e = body as { code?: unknown; message?: unknown };
  expect(typeof e.code).toBe("string");
  expect((e.code as string).length).toBeGreaterThan(0);
  expect(typeof e.message).toBe("string");
  expect((e.message as string).length).toBeGreaterThan(0);
}

describe("error envelope consistency across the API (T058 / Principle III)", () => {
  const cases: Array<{ name: string; method: "GET" | "POST"; url: string; status: number; code: string; payload?: unknown }> = [
    { name: "unknown route", method: "GET", url: "/api/v1/nope", status: 404, code: "NOT_FOUND" },
    { name: "unknown character", method: "GET", url: "/api/v1/characters/zzz", status: 404, code: "CHARACTER_NOT_FOUND" },
    { name: "unknown loadout", method: "GET", url: "/api/v1/loadouts/zzz", status: 404, code: "LOADOUT_NOT_FOUND" },
    { name: "unknown team", method: "GET", url: "/api/v1/teams/zzz", status: 404, code: "TEAM_NOT_FOUND" },
    { name: "invalid loadout", method: "POST", url: "/api/v1/loadouts", status: 422, code: "VALIDATION_ERROR", payload: { name: "x" } },
    { name: "invalid team", method: "POST", url: "/api/v1/teams", status: 422, code: "VALIDATION_ERROR", payload: { name: "x" } },
  ];

  for (const c of cases) {
    it(`${c.name} -> ${c.status} ${c.code}`, async () => {
      const res = await app.inject({ method: c.method, url: c.url, payload: c.payload });
      expect(res.statusCode).toBe(c.status);
      const body = res.json();
      expectEnvelope(body);
      expect((body as { code: string }).code).toBe(c.code);
    });
  }
});
