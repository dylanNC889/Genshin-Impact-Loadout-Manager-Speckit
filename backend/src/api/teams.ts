import type { FastifyInstance } from "fastify";
import type { DamageCalcOptions, Dataset } from "@app/contracts";
import { TeamInputSchema } from "@app/contracts";
import type { Store } from "../db/store";
import { calcTeamDamage, decorateTeam } from "../services/decorate";

function notFound(id: string) {
  return {
    code: "TEAM_NOT_FOUND",
    message: `No team with id '${id}'.`,
    remedy: "Call GET /api/v1/teams to list saved teams.",
  };
}

function validationError(message: string) {
  return { code: "VALIDATION_ERROR", message, remedy: "Correct the team fields and retry." };
}

/** Saved team CRUD + on-demand server-side damage calc (FR-019, FR-016). */
export function registerTeamRoutes(app: FastifyInstance, dataset: Dataset, store: Store): void {
  app.get("/teams", async () => store.listTeams().map((r) => decorateTeam(dataset, r)));

  app.post("/teams", async (req, reply) => {
    const parsed = TeamInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send(validationError(parsed.error.message));
    return reply.code(201).send(decorateTeam(dataset, store.createTeam(parsed.data)));
  });

  app.get("/teams/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rec = store.getTeam(id);
    if (!rec) return reply.code(404).send(notFound(id));
    return decorateTeam(dataset, rec);
  });

  app.put("/teams/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = TeamInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send(validationError(parsed.error.message));
    const rec = store.updateTeam(id, parsed.data);
    if (!rec) return reply.code(404).send(notFound(id));
    return decorateTeam(dataset, rec);
  });

  app.delete("/teams/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    return store.deleteTeam(id) ? reply.code(204).send() : reply.code(404).send(notFound(id));
  });

  app.post("/teams/:id/duplicate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rec = store.duplicateTeam(id);
    if (!rec) return reply.code(404).send(notFound(id));
    return reply.code(201).send(decorateTeam(dataset, rec));
  });

  app.post("/teams/:id/calculate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rec = store.getTeam(id);
    if (!rec) return reply.code(404).send(notFound(id));
    const options = (req.body ?? {}) as Partial<DamageCalcOptions>;
    return calcTeamDamage(dataset, rec, options, store);
  });
}
