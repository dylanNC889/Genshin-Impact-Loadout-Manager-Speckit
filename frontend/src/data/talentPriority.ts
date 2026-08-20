/**
 * Curated talent-leveling priority + a one-line "how to play" cue per character (M). Priorities
 * follow common KQM-style guidance; they're a guideline, not gospel. Attribution: KeqingMains
 * quick guides, cross-checked against each character's in-game skill text and `roles` in
 * data/genshindb/characters.json.
 *
 * Covers all 116 characters in the shipped dataset. `talentAdviceFor` keeps its role-based
 * generic fallback so characters added by a future patch still get sensible advice before
 * anyone curates them.
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

  // --- Remaining roster (added in the batch-7 curated-data refresh). Priorities follow the same
  // KQM-style guidance; each was cross-checked against the character's in-game skill text and
  // `roles` in data/genshindb/characters.json so the cue matches what the kit actually does.
  aino: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Off-field Hydro support — E for damage, Q for steady application." },
  albedo: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Geo: drop the Isotoma, let Transient Blossoms tick." },
  aloy: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Cryo bow DPS: E for Coil stacks, then Normal Attacks." },
  amber: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Fire-and-forget Pyro: E to taunt, Q for the arrow rain." },
  baizhu: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Healer/shielder: E on cooldown, Q for the revive field." },
  barbara: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Healer + Hydro applier: E for the Melody Loop, Q to emergency-heal." },
  beidou: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Electro: Q for the lightning chains." },
  candace: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Hydro infusion + DMG buff: Q to infuse, hold E to shield." },
  charlotte: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Cryo healer: Q for the Newsflash field, E to mark targets." },
  chasca: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Anemo bow carry: E to hover, then fire Shadowhunt Shells." },
  chevreuse: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Overload enabler: Q for AoE Pyro, E to heal." },
  chiori: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Geo: E plants the doll, Q for the twin blades." },
  chongyun: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Cryo infusion field: E to infuse melee teammates, Q for damage." },
  citlali: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "EM-scaling Cryo shielder: E for the Opal Shield, Q for AoE." },
  collei: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Dendro: Q for the zone, E on cooldown." },
  columbina: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Off-field Hydro: E's ripple follows your carry, Q for the Lunar Domain." },
  dahlia: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "HP-scaling Hydro shielder: Q for the shield, E for damage." },
  dehya: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Pyro field: E for the Fiery Sanctum, Q to jump in." },
  diluc: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Pyro claymore carry: E ×3, Q to infuse, then Normal Attacks." },
  diona: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Shield + heal: E for the Icy Paws shield, Q for the healing field." },
  dori: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Heal + energy: Q links the Jinni to a teammate, E for particles." },
  durin: { priority: "Elemental Burst ≈ Elemental Skill > Normal Attack", note: "Off-field Pyro: E and Q carry the kit, Normal Attacks are filler." },
  emilie: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Dendro: E's Lumidouce Case levels off Burning, Q extends it." },
  escoffier: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Cryo healer: Q heals and hits hard, E for off-field Cryo." },
  faruzan: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Anemo buffer: Q for the Anemo DMG bonus, E to set it up." },
  flins: { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Electro spear carry: E infuses Normal Attacks, Q calls the clouds." },
  freminet: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Cryo burst-window: E to build Pers Timer, then Shattering Pressure." },
  gaming: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Plunge carry: E to leap, plunge on landing; Q resets the Skill." },
  gorou: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Geo buffer: E for the DEF/Geo banner, Q to move it." },
  iansan: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "ATK buffer + battery: Q for the buff, E for Nightsoul." },
  ifa: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Hovering Anemo healer: E to fly and heal, Q for the Sedation Field." },
  illuga: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Geo buffer with a heavy Burst: E builds stacks, Q spends them." },
  ineffa: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Electro + shield: Q summons Birgitta, E for the shield." },
  jahoda: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Anemo healer/buffer: E to dash and swirl, Q drops the robots." },
  jean: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Heal + group: Q for the healing field, E to launch and gather." },
  kachina: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Geo: E summons Turbo Twirly to drill, Q boosts it." },
  kaeya: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Cryo application: Q's icicles orbit and tick, E for a quick blast." },
  kaveh: { priority: "Elemental Burst > Normal Attack > Elemental Skill", note: "Bloom driver: Q infuses his swings, E bursts Dendro Cores." },
  keqing: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Electro sword carry: E twice to infuse, Q to buff, then NA." },
  kinich: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Grapple carry: E's Loop Shot is the damage, Q for the Cannon." },
  kirara: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Dendro shielder: E for the shield, Q for AoE Dendro." },
  "kujou-sara": { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Crowfeather ATK buffer: E + a charged shot, Q to spread it." },
  "kuki-shinobu": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Hyperbloom trigger: E's ring applies Electro and heals off HP." },
  "lan-yan": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Anemo shielder: E for the Swallow-Wisp Shield, Q to pull in." },
  lauma: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Dendro + Moon Song: E builds stacks, Q spends them." },
  layla: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "HP-scaling Cryo shielder: E for the curtain, Q for Night Stars." },
  linnea: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Geo: E is Lumi's damage, Q swaps her Strike Form." },
  lisa: { priority: "Elemental Burst ≈ Elemental Skill > Normal Attack", note: "Off-field Electro: hold E for the DEF shred, Q for the Rose field." },
  lohen: { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Cryo spear carry: build Joy for the enhanced E, spend Will to Win on Q." },
  lynette: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Anemo sub-DPS: E's Enigma Thrust is the damage, Q for the box." },
  lyney: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Charged-shot Pyro carry: Prop Arrows into E, Q for the parade." },
  mika: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Physical-team support: E for ATK SPD, Q to heal and stack Physical DMG." },
  mualani: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Shark-ride carry: E to mount up, bite with charged attacks." },
  nefer: { priority: "Elemental Skill ≈ Elemental Burst > Normal Attack", note: "Dendro carry: E's Shadow Dance powers her Charged Attacks, Q to detonate." },
  nicole: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Pyro shielder/buffer: E for the shield, Q for coordinated attacks." },
  ningguang: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Charged-attack Geo: E for the Jade Screen buff, Q for the gems." },
  noelle: { priority: "Elemental Burst > Normal Attack > Elemental Skill", note: "Geo carry: Q turns DEF into ATK and infuses her swings, E shields." },
  ororon: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Off-field Electro + battery: E's orb bounces, Q for the Oculus." },
  prune: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Anemo swirl buffer: E upgrades after a Swirl, Q rings the bell." },
  qiqi: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Cryo healer: E's Herald of Frost heals on hit, Q for the talisman." },
  razor: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Physical claymore carry: E for stacks, Q for The Wolf Within." },
  rosaria: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Off-field Cryo + team CRIT Rate: E behind the target, Q for the lance." },
  sandrone: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Hovering Cryo carry: E to hover and fire Prism Shots, Q for the ray." },
  sayu: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "EM-scaling healer: Q's Daruma heals and swirls, E to roll." },
  sethos: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Charged-shot Electro: Q for the stance, then Shadowpiercing Shots." },
  "shikanoin-heizou": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Anemo fists: stack Declension, release Heartstopper Strike." },
  sigewinne: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "HP-scaling Hydro healer: E's bubbles heal and apply Hydro." },
  skirk: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Cryo sword carry: E to warp, spend Serpent's Subtlety on NA and Q." },
  thoma: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "HP-scaling Pyro shielder: Q for Scorching Ooyoroi, E to refresh." },
  tighnari: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Charged-shot Dendro: E for Vijnana Suffusion, then Wreath Arrows." },
  varesa: { priority: "Normal Attack > Elemental Burst > Elemental Skill", note: "Nightsoul plunge carry: Q for Fiery Passion, then plunging attacks." },
  varka: { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Dual-claymore Anemo carry: E to execute, Q borrows a teammate's element." },
  wriothesley: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Cryo fists: E for Chilling Penalty, then Repelling Fists." },
  xiao: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Plunge carry: Q to infuse, then E-cancel plunges." },
  xilonen: { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "RES-shred Geo buffer: E for the Blade Roller, Q to heal and buff." },
  xinyan: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Pyro shield + Physical shred: E for the DEF shield, Q for AoE." },
  yanfei: { priority: "Normal Attack > Elemental Skill > Elemental Burst", note: "Charged-attack Pyro: stack Scarlet Seals, Q for Brilliance." },
  yaoyao: { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Dendro healer: E throws Radishes, Q for on-field healing." },
  "yumemizuki-mizuki": { priority: "Elemental Skill > Elemental Burst > Normal Attack", note: "Dreamdrifter buffer: E to drift and swirl, Q for the Mini Baku." },
  "yun-jin": { priority: "Elemental Burst > Elemental Skill > Normal Attack", note: "Normal-Attack DMG buffer: Q for the flag formation, E to counter." },
  zibai: { priority: "Normal Attack ≈ Elemental Skill > Elemental Burst", note: "Geo sword carry: E infuses her attacks, Q extends the Phase Shift." },
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
