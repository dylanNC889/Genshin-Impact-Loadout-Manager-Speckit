import type { Dataset } from "@app/contracts";
import { optimize, type OptimizeQuery, type OwnedArtifact } from "@app/optimizer";

export interface OptimizeRequest {
  inventory: OwnedArtifact[];
  dataset: Dataset;
  query: OptimizeQuery;
}

// Runs the (potentially heavy) branch search off the main thread so the UI stays responsive.
self.onmessage = (e: MessageEvent<OptimizeRequest>) => {
  const { inventory, dataset, query } = e.data;
  try {
    self.postMessage({ ok: true, builds: optimize(inventory, dataset, query) });
  } catch (err) {
    self.postMessage({ ok: false, error: (err as Error).message });
  }
};
