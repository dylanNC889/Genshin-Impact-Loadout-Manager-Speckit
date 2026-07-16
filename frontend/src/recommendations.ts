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

/** Reverse lookup split by rank for a weapon: `top` = characters whose #1 pick this is. */
export function weaponRecommenders(id: string): { top: string[]; others: string[] } {
  return rankSplit(id, "weapons");
}

/** Reverse lookup split by rank for an artifact set. */
export function setRecommenders(id: string): { top: string[]; others: string[] } {
  return rankSplit(id, "sets");
}

function rankSplit(id: string, kind: "weapons" | "sets"): { top: string[]; others: string[] } {
  const top: string[] = [];
  const others: string[] = [];
  for (const [charId, r] of Object.entries(RECOMMENDATIONS)) {
    if (r[kind][0] === id) top.push(charId);
    else if (r[kind].includes(id)) others.push(charId);
  }
  return { top, others };
}

/** A character minimally described for signature derivation. */
interface RosterEntry {
  id: string;
  version: string;
  rarity: number;
}

// v1.0 launch weapons/sets are generic (standard pool / first-domain sets), never a 1:1 signature.
const LAUNCH_VERSION = "1.0";

/**
 * Derive the 1:1 signature holder — the 5★ character this item was *released with* (matching
 * debut version) and whose top-ranked pick it is. Returns undefined when there's no clean match.
 */
function deriveSignature(
  itemId: string,
  itemVersion: string,
  itemRarity: number,
  roster: RosterEntry[],
  kind: "weapons" | "sets",
): string | undefined {
  if (itemRarity !== 5 || !itemVersion || itemVersion === LAUNCH_VERSION) return undefined;
  const candidates = roster.filter(
    (c) => c.rarity === 5 && c.version === itemVersion && RECOMMENDATIONS[c.id]?.[kind][0] === itemId,
  );
  return candidates[0]?.id;
}

export function signatureWeaponHolder(
  weapon: { id: string; version: string; rarity: number },
  roster: RosterEntry[],
): string | undefined {
  return deriveSignature(weapon.id, weapon.version, weapon.rarity, roster, "weapons");
}

export function signatureSetHolder(
  set: { id: string; version: string },
  roster: RosterEntry[],
): string | undefined {
  return deriveSignature(set.id, set.version, 5, roster, "sets");
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
