/**
 * Curated talent-leveling priority + a one-line "how to play" cue per character (M). Priorities
 * follow common KQM-style guidance; they're a guideline, not gospel. Characters without an entry
 * fall back to a role-based generic (see talentAdviceFor). Attribution: KeqingMains quick guides.
 */
export interface TalentAdvice {
  /** e.g. "Elemental Burst > Elemental Skill > Normal Attack". */
  priority: string;
  /** One-line rotation / playstyle cue. */
  note: string;
}

export const TALENT_PRIORITY: Record<string, TalentAdvice> = {
  "hu-tao": { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Charged-attack Vaporize carry: E → charged-N1 spam → Q." },
  "raiden-shogun": { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Battery + burst DPS: E, then hold Q for the full sword combo." },
  ganyu: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Frostflake charged-shot DPS in Freeze/Melt." },
  "kamisato-ayaka": { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Cryo charged/NA DPS in Freeze." },
  xiangling: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Pyronado off-field DPS — build high ER." },
  bennett: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Heal + ATK field: drop Q, stand in it." },
  xingqiu: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Hydro: Q then E, let rain coat the DPS." },
  yelan: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Hydro DPS + team DMG%." },
  nahida: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Dendro driver: E to apply, Q for the EM/DMG buff." },
  "kaedehara-kazuha": { priority: "Elemental Burst ≈ Elemental Skill > Normal Attack", note: "Group + VV shred + EM buff: E to gather, Q to swirl." },
  furina: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Drive/buffer: Q for Fanfare, E for the summons." },
  zhongli: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Shield + universal RES shred: hold E for the pillar." },
  neuvillette: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Charged-attack Hydro DPS — stack Charged levels." },
  arlecchino: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Pyro NA/charged DPS: E to bond, spend it on NA." },
  tartaglia: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Melee-stance NA/Riptide DPS." },
  "kamisato-ayato": { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Shunsuiken NA DPS in melee stance." },
  eula: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Physical burst DPS: build stacks, detonate Lightfall." },
  "arataki-itto": { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Geo charged-attack DPS under Q." },
  klee: { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Charged-attack Pyro DPS." },
  yoimiya: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Pyro NA DPS during Skill window." },
  cyno: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Electro NA DPS in his Burst stance." },
  alhaitham: { priority: "Elemental Skill > Normal Attack > Elemental Burst", note: "Dendro NA/mirror DPS." },
  wanderer: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Anemo NA DPS while hovering." },
  navia: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Geo burst-shotgun DPS off crystallize shards." },
  clorinde: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Electro NA DPS in Bond of Life." },
  mavuika: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Pyro drive/DPS on Fighting Spirit." },
  mona: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Omen DMG amp + off-field Hydro." },
  sucrose: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Group + EM-share support." },
  venti: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Group + VV shred + battery." },
  fischl: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Electro via Oz." },
  "yae-miko": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Electro turrets: place 3, Q to reset." },
  shenhe: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Cryo buffer: E for quills, Q for RES shred." },
  "sangonomiya-kokomi": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Heal + Hydro apply / Bloom driver." },
  nilou: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Bloom enabler in Hydro/Dendro." },
  xianyun: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Plunge enabler + healer." },
};

/** Priority + note for a character, with a role-based fallback for uncurated characters. */
export function talentAdviceFor(id: string, roles: string[]): TalentAdvice {
  const curated = TALENT_PRIORITY[id];
  if (curated) return curated;
  const r = roles.map((x) => x.toLowerCase());
  if (r.includes("maindps")) {
    return { priority: "Level the talent your damage scales on first, then the others", note: "On-field carry — prioritise its main damage talent." };
  }
  if (r.includes("subdps")) {
    return { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field damage — Burst and Skill do the work." };
  }
  if (r.includes("healer") || r.includes("shielder") || r.includes("buffer")) {
    return { priority: "Level for utility (uptime / buff values) over raw talent levels", note: "Support — talent levels matter less than uptime." };
  }
  return { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "General guideline." };
}
