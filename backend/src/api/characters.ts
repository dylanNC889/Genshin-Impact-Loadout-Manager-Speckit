import type { FastifyInstance } from "fastify";
import type { Dataset } from "@app/contracts";
import { getCharacterDetail, listCharacters } from "../services/character.service";

interface RosterQuery {
  q?: string;
  element?: string;
  weaponType?: string;
}

/** Reference character endpoints (FR-001, FR-002, FR-004). */
export function registerCharacterRoutes(app: FastifyInstance, dataset: Dataset): void {
  app.get("/characters", async (req) => {
    const { q, element, weaponType } = req.query as RosterQuery;
    return listCharacters(dataset, { q, element, weaponType });
  });

  app.get("/characters/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const detail = getCharacterDetail(dataset, id);
    if (!detail) {
      return reply.code(404).send({
        code: "CHARACTER_NOT_FOUND",
        message: `No character with id '${id}'.`,
        remedy: "Call GET /api/v1/characters to list valid ids.",
      });
    }
    return detail;
  });
}
