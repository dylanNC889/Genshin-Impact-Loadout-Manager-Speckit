import type { ArtifactSet, Character, Weapon } from "@app/contracts";
import { RECOMMENDATIONS } from "./data/recommendations";

/**
 * Build recommendations sourced from KeqingMains quick guides (see data/recommendations.ts),
 * with an element-based heuristic fallback for any character KQM didn't cover.
 */

/** Reverse lookup: character ids that recommend this weapon or artifact-set id. */
export function recommendingCharacters(id: string): string[] {
  return Object.entries(RECOMMENDATIONS)
    .filter(([, r]) => r.weapons.includes(id) || r.sets.includes(id))
    .map(([charId]) => charId);
}

/** Element → signature artifact-set ids, for the heuristic fallback only. */
const ELEMENT_SET_HINTS: Record<string, string[]> = {
  Pyro: ["crimson-witch-of-flames"],
  Hydro: ["heart-of-depth", "nymphs-dream"],
  Electro: ["thundering-fury"],
  Cryo: ["blizzard-strayer"],
  Anemo: ["viridescent-venerer"],
  Geo: ["archaic-petra", "husk-of-opulent-dreams"],
  Dendro: ["deepwood-memories", "gilded-dreams"],
};

export interface Recommendations {
  /** Recommended weapon ids, ranked, filtered to what's available for this character. */
  weaponIds: string[];
  /** Recommended artifact-set ids, ranked, filtered to available sets. */
  setIds: string[];
  /** True when these came from KQM curation rather than the heuristic fallback. */
  curated: boolean;
}

export function recommendedFor(
  character: Pick<Character, "id" | "element" | "roles">,
  weapons: Weapon[],
  sets: ArtifactSet[],
): Recommendations {
  const curated = RECOMMENDATIONS[character.id];
  if (curated) {
    const wAvail = new Set(weapons.map((w) => w.id));
    const sAvail = new Set(sets.map((s) => s.id));
    return {
      weaponIds: curated.weapons.filter((id) => wAvail.has(id)),
      setIds: curated.sets.filter((id) => sAvail.has(id)),
      curated: true,
    };
  }
  // No KQM guide for this character — fall back to element-signature sets (weapons left unranked).
  const hints = ELEMENT_SET_HINTS[character.element] ?? [];
  const setIds = sets.filter((s) => hints.includes(s.id)).map((s) => s.id);
  return { weaponIds: [], setIds, curated: false };
}
