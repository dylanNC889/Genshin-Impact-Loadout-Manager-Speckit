import type { FastifyInstance } from "fastify";
import type { Dataset } from "@app/contracts";

/** Meta endpoints: active dataset version (FR-021) and artifact slot rules (FR-007). */
export function registerMetaRoutes(app: FastifyInstance, dataset: Dataset): void {
  app.get("/meta/dataset", async () => dataset.meta);
  app.get("/meta/rules", async () => dataset.slotStatRules);
  app.get("/meta/stat-values", async () => dataset.statValues ?? { mainStatValues: {}, subStatValues: {} });
  app.get("/meta/modifiers", async () => ({
    constellationBonuses: dataset.constellationBonuses ?? {},
    weaponRefinements: dataset.weaponRefinements ?? {},
  }));
}
