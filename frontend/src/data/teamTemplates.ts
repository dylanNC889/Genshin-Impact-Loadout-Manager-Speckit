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
    name: "Hu Tao Vaporize",
    description: "Charged-attack Pyro carry with Furina + off-field Hydro and a shielder.",
    slots: [["hu-tao"], ["furina"], ["yelan", "xingqiu"], ["zhongli", "kaedehara-kazuha"]],
  },
  {
    name: "Neuvillette",
    description: "Charged-attack Hydro carry buffed by Furina, grouped and shielded.",
    slots: [["neuvillette"], ["furina"], ["kaedehara-kazuha", "jean"], ["zhongli", "baizhu"]],
  },
  {
    name: "Arlecchino",
    description: "Pyro NA/charged carry — double-Pyro Vaporize with Bennett + Furina.",
    slots: [["arlecchino"], ["kaedehara-kazuha"], ["bennett"], ["furina"]],
  },
  {
    name: "Mavuika Pyro",
    description: "Nightsoul Pyro carry with a Pyro battery and Anemo/Dendro support.",
    slots: [["mavuika"], ["xiangling"], ["bennett"], ["citlali", "kaedehara-kazuha"]],
  },
  {
    name: "Pyro National",
    description: "Evergreen Vaporize/Overload: Pyro + Hydro + Pyro battery + grouper.",
    slots: [["xiangling"], ["xingqiu", "yelan"], ["bennett"], ["kaedehara-kazuha", "sucrose"]],
  },
  {
    name: "Clorinde Aggravate",
    description: "On-field Electro carry, Dendro driver + off-field Electro, grouped by Anemo.",
    slots: [["clorinde", "raiden-shogun"], ["fischl"], ["nahida"], ["kaedehara-kazuha", "sucrose"]],
  },
  {
    name: "Hyperbloom",
    description: "Dendro + Hydro seed Blooms; an Electro trigger detonates them.",
    slots: [["nahida"], ["xingqiu", "yelan"], ["kuki-shinobu", "raiden-shogun"], ["furina", "zhongli"]],
  },
  {
    name: "Ayaka Freeze",
    description: "Cryo carry held Frozen, buffed by Shenhe/Furina and grouped by Anemo.",
    slots: [["kamisato-ayaka"], ["furina", "sangonomiya-kokomi"], ["shenhe"], ["kaedehara-kazuha"]],
  },
  {
    name: "Nilou Bloom",
    description: "Nilou's Bountiful Cores in a Hydro/Dendro-only team.",
    slots: [["nilou"], ["nahida"], ["xingqiu", "yelan"], ["furina", "sangonomiya-kokomi"]],
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
