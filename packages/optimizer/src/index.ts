import type { ArtifactInstance, ArtifactSlot, Dataset, LoadoutInput } from "@app/contracts";
import { computeFinalStats, statRecord } from "@app/stat-engine";

/** An owned artifact (an ArtifactInstance plus a stable id for de-dup/apply). */
export interface OwnedArtifact extends ArtifactInstance {
  id: string;
}

/** What to maximise. CV = 2·CRIT Rate + CRIT DMG; the rest are the final stat value. */
export type OptimizeTarget = "CV" | "ATK" | "HP" | "DEF" | "EM";

export interface OptimizeQuery {
  characterId: string;
  level?: number;
  ascensionPhase?: number;
  weaponId?: string | null;
  constellation?: number;
  refinement?: number;
  /** Require every artifact to be this set (activates the 4-piece). Optional. */
  setId?: string;
  target: OptimizeTarget;
  /** Results to return (default 5) and candidates kept per slot before the search (default 8). */
  topN?: number;
  topKPerSlot?: number;
}

export interface OptimizedBuild {
  score: number;
  artifacts: OwnedArtifact[];
  finalStats: Record<string, number>;
}

const SLOTS: ArtifactSlot[] = ["Flower", "Plume", "Sands", "Goblet", "Circlet"];

/** The stat a target most directly cares about (for the per-slot prune heuristic). */
const TARGET_SUB: Record<OptimizeTarget, string | null> = {
  CV: null,
  ATK: "ATK_PCT",
  HP: "HP_PCT",
  DEF: "DEF_PCT",
  EM: "EM",
};

/** Cheap per-artifact quality used only to prune each slot to the top-K candidates. */
function pruneScore(a: OwnedArtifact, target: OptimizeTarget): number {
  let cv = 0;
  let hit = 0;
  const wanted = TARGET_SUB[target];
  for (const s of a.subStats) {
    if (s.key === "CRIT_RATE") cv += 2 * s.value;
    else if (s.key === "CRIT_DMG") cv += s.value;
    if (wanted && s.key === wanted) hit += s.value;
  }
  return cv + hit * 2;
}

function scoreOf(final: Record<string, number>, target: OptimizeTarget): number {
  if (target === "CV") return 2 * (final.CRIT_RATE ?? 0) + (final.CRIT_DMG ?? 0);
  return final[target] ?? 0;
}

/**
 * Search an owned-artifact inventory for the builds that best maximise `target` for a
 * character. Each slot is pruned to its top-K candidates, then the K^5 combinations are
 * scored via the real stat engine and the best `topN` returned. Pure and deterministic.
 */
export function optimize(inventory: OwnedArtifact[], dataset: Dataset, q: OptimizeQuery): OptimizedBuild[] {
  const topN = q.topN ?? 5;
  const topK = q.topKPerSlot ?? 8;

  // Bucket candidates by slot, apply the set filter, keep the top-K by the prune heuristic.
  const bySlot: Record<ArtifactSlot, OwnedArtifact[]> = { Flower: [], Plume: [], Sands: [], Goblet: [], Circlet: [] };
  for (const a of inventory) {
    if (q.setId && a.setId !== q.setId) continue;
    if (bySlot[a.slot]) bySlot[a.slot].push(a);
  }
  for (const slot of SLOTS) {
    bySlot[slot] = bySlot[slot].sort((x, y) => pruneScore(y, q.target) - pruneScore(x, q.target)).slice(0, topK);
    if (bySlot[slot].length === 0) return []; // can't form a full build
  }

  const baseLoadout: Omit<LoadoutInput, "artifacts"> = {
    name: "opt",
    characterId: q.characterId,
    level: q.level ?? 90,
    ascensionPhase: q.ascensionPhase ?? 6,
    weaponId: q.weaponId ?? null,
    constellation: q.constellation ?? 0,
    refinement: q.refinement ?? 1,
  };

  const results: OptimizedBuild[] = [];
  for (const flower of bySlot.Flower)
    for (const plume of bySlot.Plume)
      for (const sands of bySlot.Sands)
        for (const goblet of bySlot.Goblet)
          for (const circlet of bySlot.Circlet) {
            const artifacts = [flower, plume, sands, goblet, circlet];
            const final = statRecord(computeFinalStats({ ...baseLoadout, artifacts }, dataset).stats);
            results.push({ score: scoreOf(final, q.target), artifacts, finalStats: final });
          }

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}
