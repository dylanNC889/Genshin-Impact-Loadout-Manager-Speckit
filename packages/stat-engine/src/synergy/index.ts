import type { Element, Role, SynergyAssessment } from "@app/contracts";
import { RESONANCE_TABLE, REACTION_TABLE, pairKey } from "./tables";

export interface SynergyMember {
  element: Element;
  roles: Role[];
}

const SURVIVABILITY_ROLES: Role[] = ["Healer", "Shielder"];

/**
 * Rule-based team synergy assessment (FR-015): active resonances, triggerable reactions,
 * and role coverage with gaps. Always returns a meaningful, non-empty assessment, even for
 * partial or off-meta teams (spec edge case / US3 scenario 5).
 */
export function assessSynergy(members: SynergyMember[]): SynergyAssessment {
  const complete = members.length === 4;
  const elements = members.map((m) => m.element);

  // Resonances: any element present >= 2 times.
  const counts = new Map<Element, number>();
  for (const e of elements) counts.set(e, (counts.get(e) ?? 0) + 1);
  const resonances: { name: string; description: string }[] = [];
  for (const [el, c] of counts) {
    if (c >= 2) resonances.push(RESONANCE_TABLE[el]);
  }

  // Reactions: each unordered pair of distinct elements present.
  const distinct = [...new Set(elements)];
  const reactionSet = new Set<string>();
  for (let i = 0; i < distinct.length; i++) {
    for (let j = i + 1; j < distinct.length; j++) {
      const a = distinct[i];
      const b = distinct[j];
      if (a === undefined || b === undefined) continue;
      const r = REACTION_TABLE[pairKey(a, b)];
      if (r) reactionSet.add(r);
    }
  }
  const possibleReactions = [...reactionSet].sort();

  // Role coverage + gaps.
  const covered = [...new Set(members.flatMap((m) => m.roles))];
  const gaps: string[] = [];
  for (const role of SURVIVABILITY_ROLES) {
    if (!covered.includes(role)) gaps.push(role);
  }
  const hasDamage = covered.includes("MainDPS") || covered.includes("SubDPS");
  if (!hasDamage) gaps.push("Damage dealer (MainDPS/SubDPS)");

  const notes: string[] = [];
  if (!complete) notes.push(`Team has ${members.length}/4 members (incomplete assessment).`);
  if (resonances.length === 0) notes.push("No elemental resonance active.");
  if (possibleReactions.length === 0) notes.push("No elemental reactions available from this composition.");
  if (gaps.length === 0) notes.push("Solid coverage: damage and survivability roles are present.");

  return {
    complete,
    resonances,
    possibleReactions,
    roleCoverage: { covered, gaps },
    notes,
  };
}
