import type { FastifyInstance } from "fastify";
import type { Dataset } from "@app/contracts";
import { LoadoutInputSchema } from "@app/contracts";
import type { Store } from "../db/store";
import { decorateLoadout } from "../services/decorate";

function notFound(id: string) {
  return {
    code: "LOADOUT_NOT_FOUND",
    message: `No loadout with id '${id}'.`,
    remedy: "Call GET /api/v1/loadouts to list saved loadouts.",
  };
}

function validationError(message: string) {
  return { code: "VALIDATION_ERROR", message, remedy: "Correct the loadout fields and retry." };
}

/** Saved loadout CRUD + duplicate (FR-018). */
export function registerLoadoutRoutes(app: FastifyInstance, dataset: Dataset, store: Store): void {
  app.get("/loadouts", async () => store.listLoadouts().map((r) => decorateLoadout(dataset, r)));

  app.post("/loadouts", async (req, reply) => {
    const parsed = LoadoutInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send(validationError(parsed.error.message));
    return reply.code(201).send(decorateLoadout(dataset, store.createLoadout(parsed.data)));
  });

  app.get("/loadouts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rec = store.getLoadout(id);
    if (!rec) return reply.code(404).send(notFound(id));
    return decorateLoadout(dataset, rec);
  });

  app.put("/loadouts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = LoadoutInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send(validationError(parsed.error.message));
    const rec = store.updateLoadout(id, parsed.data);
    if (!rec) return reply.code(404).send(notFound(id));
    return decorateLoadout(dataset, rec);
  });

  app.delete("/loadouts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return store.deleteLoadout(id) ? reply.code(204).send() : reply.code(404).send(notFound(id));
  });

  app.post("/loadouts/:id/duplicate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rec = store.duplicateLoadout(id);
    if (!rec) return reply.code(404).send(notFound(id));
    return reply.code(201).send(decorateLoadout(dataset, rec));
  });
}
