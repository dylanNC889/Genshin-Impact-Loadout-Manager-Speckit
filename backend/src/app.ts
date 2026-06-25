import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyError, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { loadBundledDataset } from "@app/dataset";
import { registerMetaRoutes } from "./api/meta";
import { registerCharacterRoutes } from "./api/characters";
import { registerReferenceRoutes } from "./api/reference";
import { registerLoadoutRoutes } from "./api/loadouts";
import { registerTeamRoutes } from "./api/teams";
import { FileStore, type Store } from "./db/store";

export interface BuildOptions {
  /** Inject a store (tests use a temp/in-memory file); defaults to a JSON file store. */
  store?: Store;
}

/**
 * Build the Fastify app (FR-001/002/004 + T016). The reference dataset is served from the
 * curated JSON slice via @app/dataset — no database required (Docker-free). All errors use
 * the actionable envelope { code, message, remedy } (Constitution Principle III).
 */
export function buildApp(options: BuildOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const dataset = loadBundledDataset();
  const store =
    options.store ?? new FileStore(process.env.STORE_PATH ?? join(process.cwd(), ".data", "store.json"));

  app.register(cors, { origin: true });

  app.get("/health", async () => ({ status: "ok", dataset: dataset.meta.gameVersion }));

  app.register(
    async (api) => {
      registerMetaRoutes(api, dataset);
      registerCharacterRoutes(api, dataset);
      registerReferenceRoutes(api, dataset);
      registerLoadoutRoutes(api, dataset, store);
      registerTeamRoutes(api, dataset, store);
    },
    { prefix: "/api/v1" },
  );

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found.`,
      remedy: "Check the request path and method.",
    });
  });

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    reply.code(err.statusCode ?? 500).send({
      code: err.code ?? "INTERNAL_ERROR",
      message: err.message,
    });
  });

  return app;
}
