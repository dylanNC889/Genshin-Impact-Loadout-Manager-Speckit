import type { ConditionalBuff, Element } from "@app/contracts";

/**
 * Which conditional buffs a build has *unlocked* — the gear/constellation/element gates, not
 * whether the user has ticked them (batch 7 #3).
 *
 * This lived only inside `LoadoutEditor`, so the optimizer had no way to ask the question and
 * scored every candidate with `activeConditionals: []` — blind to exactly the 4-piece effects
 * players build around. Extracted here so the editor and the optimizer answer it identically.
 */
export interface BuffContext {
  /** The character being built — gates constellation buffs to their own owner. */
  characterId?: string;
  weaponId?: string | null;
  /** Equipped piece count per set id. */
  setCounts: Map<string, number> | Record<string, number>;
  constellation?: number;
  /** The character's element — gates buffs like VV that only their own element can trigger. */
  element?: Element;
}

const countFor = (counts: BuffContext["setCounts"], setId: string): number =>
  counts instanceof Map ? (counts.get(setId) ?? 0) : (counts[setId] ?? 0);

/** True when `ctx` unlocks `buff` (all declared gates satisfied). */
export function buffApplies(buff: ConditionalBuff, ctx: BuffContext): boolean {
  if (buff.characterId && buff.characterId !== ctx.characterId) return false;
  if (buff.weaponId && buff.weaponId !== ctx.weaponId) return false;
  // A set-gated buff defaults to the 2-piece tier when it doesn't say otherwise.
  if (buff.setId && countFor(ctx.setCounts, buff.setId) < (buff.minPieces ?? 2)) return false;
  if (buff.minConstellation && (ctx.constellation ?? 0) < buff.minConstellation) return false;
  if (buff.element && buff.element !== ctx.element) return false;
  return true;
}

/** The buffs `ctx` unlocks, in catalogue order. */
export function applicableConditionalBuffs(
  buffs: ConditionalBuff[] | undefined,
  ctx: BuffContext,
): ConditionalBuff[] {
  return (buffs ?? []).filter((b) => buffApplies(b, ctx));
}

/**
 * Ids of the unlocked buffs that are on by default — what a build "would have" without the user
 * touching anything. This is the set the optimizer scores with, so its ranking reflects the build
 * a player would actually end up running.
 */
export function defaultActiveConditionals(
  buffs: ConditionalBuff[] | undefined,
  ctx: BuffContext,
): string[] {
  return applicableConditionalBuffs(buffs, ctx)
    .filter((b) => b.defaultOn)
    .map((b) => b.id);
}
