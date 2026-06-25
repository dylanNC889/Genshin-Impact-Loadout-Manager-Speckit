import type { FastifyInstance } from "fastify";
import type { Dataset } from "@app/contracts";
import { listArtifactSets, listWeapons } from "../services/reference.service";

interface WeaponQuery {
  weaponType?: string;
}

/** Reference endpoints for loadout gear (FR-005, FR-009). */
export function registerReferenceRoutes(app: FastifyInstance, dataset: Dataset): void {
  app.get("/weapons", async (req) => {
    const { weaponType } = req.query as WeaponQuery;
    return listWeapons(dataset, weaponType);
  });

  app.get("/artifact-sets", async () => listArtifactSets(dataset));
}
