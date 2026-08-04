/**
 * Curated meta team templates (E) — one-click starters for the team builder. Each slot is a list
 * of candidate character ids, best first; the builder fills it with the first candidate the user
 * owns (else the first). Archetype-level and few, so they age gracefully. Source: common KQM meta.
 */
export interface TeamTemplate {
  name: string;
  description: string;
  /** One entry per slot; each a best-first list of interchangeable candidate character ids. */
  slots: string[][];
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    name: "Pyro National",
    description: "Vaporize/Overload staple: Pyro DPS + Hydro + Pyro battery + grouper.",
    slots: [["xiangling"], ["xingqiu", "yelan"], ["bennett"], ["kaedehara-kazuha", "sucrose", "venti"]],
  },
  {
    name: "Hu Tao Vaporize",
    description: "Charged-attack Pyro carry with off-field Hydro and a shielder.",
    slots: [["hu-tao"], ["xingqiu", "yelan"], ["zhongli"], ["kaedehara-kazuha", "sucrose"]],
  },
  {
    name: "Freeze",
    description: "Cryo DPS + Hydro applicator held frozen, with a Cryo buffer and grouper.",
    slots: [["kamisato-ayaka", "ganyu"], ["sangonomiya-kokomi", "mona"], ["shenhe", "kaedehara-kazuha"], ["kaedehara-kazuha", "venti"]],
  },
  {
    name: "Aggravate",
    description: "On-field Electro with a Dendro driver and off-field Electro, grouped by Anemo.",
    slots: [["raiden-shogun", "yae-miko"], ["fischl"], ["nahida"], ["kaedehara-kazuha", "sucrose"]],
  },
  {
    name: "Hyperbloom",
    description: "Dendro + Hydro seed Blooms; an Electro trigger detonates them.",
    slots: [["nahida"], ["xingqiu", "yelan"], ["kuki-shinobu", "raiden-shogun"], ["zhongli", "kaedehara-kazuha"]],
  },
  {
    name: "Nilou Bloom",
    description: "Nilou's Bountiful Cores in a Hydro/Dendro-only team.",
    slots: [["nilou"], ["nahida"], ["xingqiu", "yelan"], ["sangonomiya-kokomi"]],
  },
  {
    name: "Mono Geo",
    description: "Geo DPS with a Geo buffer, an off-field Geo, and a shielder.",
    slots: [["arataki-itto"], ["gorou"], ["albedo"], ["zhongli"]],
  },
];

/** Fill a template's slots, preferring characters the user owns; keeps picks distinct. */
export function resolveTemplate(t: TeamTemplate, owned: Set<string>): string[] {
  const picked: string[] = [];
  for (const candidates of t.slots) {
    const choice =
      candidates.find((id) => owned.has(id) && !picked.includes(id)) ??
      candidates.find((id) => !picked.includes(id)) ??
      candidates[0];
    if (choice) picked.push(choice);
  }
  return picked;
}
