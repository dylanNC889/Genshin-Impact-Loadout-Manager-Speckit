import type { Element } from "@app/contracts";

/** Elemental resonance granted when a team has >=2 members of an element (FR-013). */
export const RESONANCE_TABLE: Record<Element, { name: string; description: string }> = {
  Pyro: { name: "Fervent Flames", description: "Affected by Cryo for 40% less time; +25% ATK." },
  Hydro: { name: "Soothing Water", description: "Affected by Pyro for 40% less time; +25% Max HP." },
  Cryo: {
    name: "Shattering Ice",
    description: "Affected by Electro for 40% less time; +15% CRIT Rate vs frozen/Cryo-affected enemies.",
  },
  Electro: {
    name: "High Voltage",
    description: "Affected by Hydro for 40% less time; reactions generate Electro particles.",
  },
  Anemo: {
    name: "Impetuous Winds",
    description: "-15% Stamina consumption; +10% Movement SPD; -5% skill CD.",
  },
  Geo: {
    name: "Enduring Rock",
    description: "+15% shield strength; +15% DMG while shielded; shields reduce enemy Geo RES.",
  },
  Dendro: {
    name: "Sprawling Greenery",
    description: "+50 Elemental Mastery; reactions grant additional EM.",
  },
};

/** Build a stable, order-independent key for a pair of elements. */
export function pairKey(a: Element, b: Element): string {
  return [a, b].sort().join("+");
}

/** Reactions triggerable from an unordered pair of distinct elements (FR-014). */
export const REACTION_TABLE: Record<string, string> = (() => {
  const pairs: ReadonlyArray<readonly [Element, Element, string]> = [
    ["Pyro", "Hydro", "Vaporize"],
    ["Pyro", "Cryo", "Melt"],
    ["Pyro", "Electro", "Overloaded"],
    ["Pyro", "Dendro", "Burning"],
    ["Pyro", "Anemo", "Swirl"],
    ["Pyro", "Geo", "Crystallize"],
    ["Hydro", "Electro", "Electro-Charged"],
    ["Hydro", "Cryo", "Frozen"],
    ["Hydro", "Dendro", "Bloom"],
    ["Hydro", "Anemo", "Swirl"],
    ["Hydro", "Geo", "Crystallize"],
    ["Electro", "Cryo", "Superconduct"],
    ["Electro", "Dendro", "Quicken"],
    ["Electro", "Anemo", "Swirl"],
    ["Electro", "Geo", "Crystallize"],
    ["Cryo", "Anemo", "Swirl"],
    ["Cryo", "Geo", "Crystallize"],
  ];
  const table: Record<string, string> = {};
  for (const [a, b, name] of pairs) table[pairKey(a, b)] = name;
  return table;
})();
