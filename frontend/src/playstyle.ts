import type { Character } from "@app/contracts";

/** Human labels for the internal role enum. */
const ROLE_LABELS: Record<string, string> = {
  MainDPS: "Main DPS",
  SubDPS: "Sub-DPS",
  Buffer: "Buffer",
  Healer: "Healer",
  Shielder: "Shielder",
  Battery: "Battery",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * Hand-written playstyle blurbs for popular characters (keyed by character id / slug).
 * Anyone not listed falls back to a sentence templated from their role/element/weapon —
 * see `playstyleFor`. Add entries here freely; no dataset regeneration is required.
 */
const CURATED: Record<string, string> = {
  diluc:
    "A premier Pyro main-DPS. Chains his three-hit Elemental Skill into heavy claymore swings, with his Burst delivering an AoE Pyro finisher — a classic Vaporize/Melt carry.",
  "hu-tao":
    "A Pyro main-DPS who converts her sky-high Max HP into ATK on her Elemental Skill, then melts enemies with charged attacks — the definitive HP-scaling Vaporize carry.",
  "raiden-shogun":
    "An Electro sub-DPS and battery. Buffs the team's Burst damage off Energy Recharge, restores energy, and unleashes a long, hard-hitting Elemental Burst.",
  "kaedehara-kazuha":
    "An Anemo support who groups enemies, shreds elemental resistance, and buffs the team's elemental damage via Elemental Mastery — a universal off-field enabler.",
  bennett:
    "The gold-standard support: his Elemental Burst field heals the party and grants a massive flat ATK buff, making him a staple in most Pyro and hypercarry teams.",
  xingqiu:
    "A Hydro sub-DPS whose Burst rains off-field sword rain, applying steady Hydro for Vaporize/Freeze and offering damage reduction and interruption resistance.",
  xiangling:
    "A Pyro sub-DPS built around Pyronado — a long off-field Pyro Burst that pairs with Bennett and enablers to deal enormous sustained damage.",
  nahida:
    "A Dendro sub-DPS and enabler. Applies wide, constant off-field Dendro, scales damage off Elemental Mastery, and buffs the whole team's EM.",
  zhongli:
    "A Geo shielder whose near-unbreakable shield scales with Max HP and shreds enemy resistances, providing rock-solid survivability for any team.",
  furina:
    "A Hydro on/off-field DPS and buffer. Her Fanfare stacks convert team HP changes into a huge party-wide damage bonus while she heals through the fervent melody.",
  neuvillette:
    "A Hydro main-DPS who scales off Max HP and blasts enemies with a piercing charged-attack beam, ramping as he gathers Source Water droplets.",
  ganyu:
    "A Cryo main-DPS built around her frostflake charged shots — layered AoE Cryo that excels in Melt and permafreeze teams.",
  "kamisato-ayaka":
    "A Cryo main-DPS with alternate-sprint Cryo infusion and a wide, hard-hitting Burst — the centerpiece of permafreeze compositions.",
  yelan:
    "A Hydro sub-DPS whose HP-scaling Burst fires off-field homing bolts and ramps up team damage, mirroring Xingqiu with better mobility and energy.",
  "sangonomiya-kokomi":
    "A Hydro healer and applier. Her Burst heals the party and applies constant off-field Hydro, keeping Freeze and Vaporize teams topped up.",
  venti:
    "An Anemo crowd-controller and battery. His Burst sucks enemies into a tornado, absorbs an element to deal bonus damage, and floods the team with energy.",
  arlecchino:
    "A Pyro main-DPS who consumes her Bond of Life to power up self-infused normal and charged attacks, dealing heavy single-target Pyro damage largely independent of a healer.",
  alhaitham:
    "A Dendro main-DPS whose mirror-generating Elemental Skill drives on-field Dendro damage scaling off Elemental Mastery — the premier Spread/Quicken carry.",
  nilou:
    "A Hydro enabler who supercharges Bloom teams: her Skill dance grants a Bountiful Core buff so Nilou–Dendro–Hydro cores hit far harder, scaling off Max HP.",
  "yae-miko":
    "An Electro sub-DPS who plants off-field Sesshou Sakura turrets that zap enemies and whose Burst detonates them — a top Aggravate and Taser damage dealer.",
  mona:
    "A Hydro sub-DPS and buffer. Her Burst's Omen bubble amplifies all incoming damage while she applies Hydro; excellent in Vaporize and Freeze burst windows.",
  tartaglia:
    "A Hydro main-DPS (Childe) whose Riptide melee stance drenches enemies in Hydro; a premier driver for Vaporize and international-style rotations.",
  eula:
    "A Cryo main-DPS dealing Physical damage. Stacks Grimheart and Lightfall so her delayed Burst explosion lands one of the biggest single hits in the game.",
  klee:
    "A Pyro main-DPS who lobs explosive charged attacks and Jumpy Dumpty bombs — bursty AoE Pyro that thrives in Vaporize and Overload teams.",
  "kamisato-ayato":
    "A Hydro main-DPS whose Skill grants a self-infused Namisen stance, flurrying HP-scaling Hydro water blades; a strong on-field driver and Vaporize carry.",
  cyno:
    "An Electro main-DPS whose Judication stance extends an aggressive on-field combo; excels in Aggravate and Quicken teams with high Electro application.",
  keqing:
    "An Electro (or self-infused) main-DPS with fast teleporting combos and strong single-target burst — flexible in Aggravate, Quickbloom, and mono-Electro teams.",
  wanderer:
    "An Anemo main-DPS (Scaramouche) who hovers above the field, firing rapid Anemo normals with an absorbed elemental buff — mobile, catalyst-based carry.",
  xiao:
    "An Anemo plunge main-DPS. His Burst grants Anemo-infused, sky-high plunging attacks at the cost of HP — a fast, self-sufficient solo carry.",
  navia:
    "A Geo main-DPS who fires a shotgun blast empowered by collected Crystal Shrapnel, dealing burst Geo damage; strongest in mono-Geo and Crystallize teams.",
  clorinde:
    "An Electro main-DPS who converts a Bond of Life into hard-hitting self-infused sword thrusts; a Bond-of-Life-driven Hyperbloom and Aggravate carry.",
  wriothesley:
    "A Cryo main-DPS who fights bare-fisted, gaining HP-triggered charged punches at low HP; a self-sufficient on-field Cryo bruiser.",
  "arataki-itto":
    "A Geo main-DPS whose superlative superstrength charged attacks scale off DEF; the flagship mono-Geo and Crystallize claymore carry.",
  yoimiya:
    "A Pyro main-DPS with self-infused, pinpoint single-target normal attacks — a steady Vaporize carry that excels against single, fast-moving targets.",
  mavuika:
    "The Pyro Archon and premier main-DPS. Her Nightsoul stance fuels a motorcycle finisher and sustained on-field Pyro, buffed by nearby Nightsoul allies.",
  noelle:
    "A Geo main-DPS and healer whose Burst converts DEF into ATK and infuses her claymore with Geo — a self-sustaining budget carry that also shields and heals.",
  fischl:
    "An Electro sub-DPS. Her raven Oz stays on the field zapping enemies with steady Electro, the backbone of Aggravate, Taser, and Hyperbloom teams.",
};

/**
 * Returns a playstyle sentence for a character: the curated blurb if one exists, otherwise a
 * sentence templated from role(s) + element + weapon type (full coverage, no data needed).
 */
export function playstyleFor(character: Pick<Character, "id" | "element" | "weaponType" | "rarity" | "roles">): string {
  const curated = CURATED[character.id];
  if (curated) return curated;
  const roles = character.roles.map(roleLabel);
  const roleText =
    roles.length === 0
      ? "a flexible"
      : roles.length === 1
        ? `a ${roles[0]}`
        : `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]}`;
  const suffix = roles.length > 1 ? " roles" : " role";
  return `A ${character.rarity}★ ${character.element} ${character.weaponType} character who fills ${roleText}${suffix}.`;
}
