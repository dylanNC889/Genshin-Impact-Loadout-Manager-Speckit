import type { ConditionalBuff, Element, ResShred, TalentScope } from "@app/contracts";
import { TALENT_SCOPES } from "@app/contracts";

/**
 * Combat effects that a build's enabled conditional buffs contribute but that CANNOT live on the
 * stat sheet (research: engine gap closure).
 *
 * `computeFinalStats` folds sheet-additive stats — ATK%, CRIT, EM, ER, element/physical DMG%.
 * Two common effect kinds don't belong there:
 *   - per-hit DMG% ("+50% Charged Attack DMG"): scoped to one talent, so folding it into the
 *     sheet would inflate every other hit in the build.
 *   - enemy RES shred ("−40% RES to the swirled element"): a debuff on the target, not a stat
 *     on the character.
 * Both are therefore resolved here and applied inside the damage calc instead.
 */
export interface CombatEffects {
  /** DMG% (percent points) per talent scope. Every scope is present; unbuffed scopes are 0. */
  talentDmgPct: Record<TalentScope, number>;
  /** RES shred entries contributed by the enabled buffs, unresolved (see totalResShred). */
  resShred: ResShred[];
}

const emptyTalentDmg = (): Record<TalentScope, number> =>
  Object.fromEntries(TALENT_SCOPES.map((s) => [s, 0])) as Record<TalentScope, number>;

/** The combat effects of the enabled conditional buffs. Unknown ids are ignored. */
export function conditionalCombatEffects(
  activeConditionals: string[] | undefined,
  buffs: ConditionalBuff[] | undefined,
): CombatEffects {
  const talentDmgPct = emptyTalentDmg();
  const resShred: ResShred[] = [];
  if (!activeConditionals?.length || !buffs?.length) return { talentDmgPct, resShred };

  const byId = new Map(buffs.map((b) => [b.id, b]));
  for (const id of activeConditionals) {
    const buff = byId.get(id);
    if (!buff) continue;
    for (const bonus of buff.talentDmgBonuses ?? []) {
      for (const scope of bonus.scopes) talentDmgPct[scope] += bonus.value;
    }
    if (buff.resShred) resShred.push(buff.resShred);
  }
  return { talentDmgPct, resShred };
}

/**
 * Total RES shred applying to damage of `element`, as percent points.
 *
 * Rules:
 *   - An entry with `elements` only applies to those elements. When the damage element is
 *     unknown we skip element-scoped shreds rather than guess — better to under-count than to
 *     credit a Pyro build with a shred it never gets.
 *   - Entries sharing a `source` are the same in-game effect reached by two routes (a teammate
 *     known to run VV, and this build's own VV 4pc), so they take the MAX instead of stacking.
 *   - The total is capped at 60 points; real stacking past that is rare and the game halves
 *     negative RES anyway, so an uncapped sum would flatter the estimate.
 */
export function totalResShred(shreds: ResShred[], element: Element | undefined): number {
  const bySource = new Map<string, number>();
  let unsourced = 0;
  for (const s of shreds) {
    if (s.elements && (!element || !s.elements.includes(element))) continue;
    if (s.source) bySource.set(s.source, Math.max(bySource.get(s.source) ?? 0, s.pct));
    else unsourced += s.pct;
  }
  const total = [...bySource.values()].reduce((sum, v) => sum + v, unsourced);
  return Math.min(total, 60);
}
