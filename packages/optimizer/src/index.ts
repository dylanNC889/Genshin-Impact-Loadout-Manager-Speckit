import type {
  ArtifactInstance,
  ArtifactSlot,
  ConditionalBuff,
  Dataset,
  Element,
  LoadoutInput,
} from "@app/contracts";
import { DEFAULT_TALENT_LEVELS } from "@app/contracts";
import { computeFinalStats, defaultActiveConditionals, statRecord } from "@app/stat-engine";

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
  /**
   * Score each candidate with the conditional buffs it unlocks (default true) — the build the
   * player would actually run. Set false to rank the artifacts bare, which is a fair question
   * ("what do these pieces give me on their own") but under-rates 4-piece sets.
   */
  includeConditionals?: boolean;
}

export interface OptimizedBuild {
  score: number;
  artifacts: OwnedArtifact[];
  finalStats: Record<string, number>;
  /** Conditional-buff ids folded into `finalStats` (empty when includeConditionals is false). */
  activeConditionals: string[];
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

/** The gates that don't depend on which artifacts a candidate uses, so they can be checked once. */
function buffPassesFixedGates(
  buff: ConditionalBuff,
  ctx: { characterId?: string; weaponId?: string | null; constellation?: number; element?: Element },
): boolean {
  if (buff.characterId && buff.characterId !== ctx.characterId) return false;
  if (buff.weaponId && buff.weaponId !== ctx.weaponId) return false;
  if (buff.minConstellation && (ctx.constellation ?? 0) < buff.minConstellation) return false;
  if (buff.element && buff.element !== ctx.element) return false;
  return true;
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
    notes: "",
    tags: [],
    activeConditionals: [],
    // Talent levels don't affect the stat sheet, so the search is indifferent to them.
    talentLevels: DEFAULT_TALENT_LEVELS,
  };

  // Conditional buffs (batch 7 #3). Scoring every candidate bare made the optimizer blind to the
  // 4-piece effects players build around — it could not see Marechaussee Hunter's +36% CRIT Rate
  // under target CV, or Noblesse Oblige's +20% ATK under target ATK, so it under-rated the very
  // sets it should recommend.
  //
  // The weapon, constellation and element gates are fixed for the whole search, so narrow the
  // catalogue once up front; only the set-piece counts vary per candidate.
  const includeConditionals = q.includeConditionals ?? true;
  const element = dataset.characters.find((c) => c.id === q.characterId)?.element;
  const fixedCtx = {
    characterId: q.characterId,
    weaponId: baseLoadout.weaponId,
    constellation: baseLoadout.constellation,
    element,
  };
  const candidateBuffs = includeConditionals
    ? (dataset.conditionalBuffs ?? []).filter((b) =>
        // Re-checked per candidate with real counts; here just drop what gear can never unlock.
        buffPassesFixedGates(b, fixedCtx),
      )
    : [];

  const results: OptimizedBuild[] = [];
  for (const flower of bySlot.Flower)
    for (const plume of bySlot.Plume)
      for (const sands of bySlot.Sands)
        for (const goblet of bySlot.Goblet)
          for (const circlet of bySlot.Circlet) {
            const artifacts = [flower, plume, sands, goblet, circlet];
            let activeConditionals: string[] = [];
            if (candidateBuffs.length) {
              const setCounts = new Map<string, number>();
              for (const a of artifacts) setCounts.set(a.setId, (setCounts.get(a.setId) ?? 0) + 1);
              activeConditionals = defaultActiveConditionals(candidateBuffs, { ...fixedCtx, setCounts });
            }
            const final = statRecord(
              computeFinalStats({ ...baseLoadout, artifacts, activeConditionals }, dataset).stats,
            );
            results.push({ score: scoreOf(final, q.target), artifacts, finalStats: final, activeConditionals });
          }

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}
