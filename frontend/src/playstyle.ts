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
