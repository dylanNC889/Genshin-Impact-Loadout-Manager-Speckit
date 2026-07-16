/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Imports an accurate, full reference dataset from the `genshin-db` package and writes it
 * into `data/genshindb/` in the authored shape consumed by the loader. genshin-db is a
 * dev-only dependency used at generation time; the runtime loader only reads the JSON.
 *
 * Run: pnpm --filter @app/dataset exec tsx scripts/import.mts
 */
import genshindb from "genshin-db";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, "..", "..", "..", "data", "genshindb");

const round = (n: number) => Math.round(n * 100) / 100;
// enka.network hosts every game UI icon by its internal filename — complete + reliable
// (mihoyo's CDN 404s on newer content and lacks many artifact icons).
const enkaUrl = (filename?: string) => (filename ? `https://enka.network/ui/${filename}.png` : "");
// Strip genshin-db rich-text markup (e.g. <color=#..>…</color>), keeping {0}/{1} placeholders.
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Collapse whitespace and cap a constellation/effect description for display. */
const conText = (d: unknown) => {
  const s = String(d ?? "").replace(/\s+/g, " ").trim();
  return s.length > 400 ? `${s.slice(0, 397)}…` : s;
};

// genshin-db stat text -> our StatKey
const SUBSTAT_TO_KEY: Record<string, string> = {
  "CRIT DMG": "CRIT_DMG",
  "CRIT Rate": "CRIT_RATE",
  "Energy Recharge": "ER",
  "Elemental Mastery": "EM",
  "Healing Bonus": "HEAL_BONUS",
  HP: "HP_PCT",
  ATK: "ATK_PCT",
  DEF: "DEF_PCT",
  "Pyro DMG Bonus": "PYRO_DMG",
  "Hydro DMG Bonus": "HYDRO_DMG",
  "Electro DMG Bonus": "ELECTRO_DMG",
  "Cryo DMG Bonus": "CRYO_DMG",
  "Anemo DMG Bonus": "ANEMO_DMG",
  "Geo DMG Bonus": "GEO_DMG",
  "Dendro DMG Bonus": "DENDRO_DMG",
  "Physical DMG Bonus": "PHYS_DMG",
};

const ELEMENTS = new Set(["Pyro", "Hydro", "Electro", "Cryo", "Anemo", "Geo", "Dendro"]);
const WEAPON_TYPES = new Set(["Sword", "Claymore", "Polearm", "Bow", "Catalyst"]);

// genshin-db has no role data — curate the archetype per character (community consensus,
// cross-checked against KeqingMains). Anyone missing falls back to MainDPS.
const ROLE_OVERRIDES: Record<string, string[]> = {
  aino: ["SubDPS", "Buffer"],
  albedo: ["SubDPS"],
  alhaitham: ["MainDPS"],
  aloy: ["MainDPS"],
  amber: ["MainDPS"],
  "arataki-itto": ["MainDPS"],
  arlecchino: ["MainDPS"],
  baizhu: ["Healer", "SubDPS"],
  barbara: ["Healer", "SubDPS"],
  beidou: ["SubDPS"],
  bennett: ["Buffer", "Healer"],
  candace: ["Buffer", "SubDPS"],
  charlotte: ["Healer", "Buffer"],
  chasca: ["MainDPS"],
  chevreuse: ["Buffer", "Healer"],
  chiori: ["SubDPS"],
  chongyun: ["SubDPS"],
  citlali: ["Buffer", "SubDPS"],
  clorinde: ["MainDPS"],
  collei: ["SubDPS"],
  columbina: ["SubDPS", "Buffer"],
  cyno: ["MainDPS"],
  dahlia: ["Shielder", "Buffer"],
  dehya: ["SubDPS"],
  diluc: ["MainDPS"],
  diona: ["Healer", "Shielder"],
  dori: ["Healer", "Battery"],
  durin: ["SubDPS", "Buffer"],
  emilie: ["SubDPS"],
  escoffier: ["SubDPS", "Healer"],
  eula: ["MainDPS"],
  faruzan: ["Buffer", "SubDPS"],
  fischl: ["SubDPS"],
  flins: ["MainDPS"],
  freminet: ["SubDPS"],
  furina: ["Buffer", "SubDPS"],
  gaming: ["MainDPS"],
  ganyu: ["MainDPS"],
  gorou: ["Buffer"],
  "hu-tao": ["MainDPS"],
  iansan: ["Buffer", "Battery"],
  ifa: ["MainDPS", "Healer"],
  illuga: ["Buffer"],
  ineffa: ["SubDPS", "Shielder"],
  jahoda: ["Healer", "Buffer"],
  jean: ["Healer", "Buffer"],
  kachina: ["SubDPS"],
  "kaedehara-kazuha": ["Buffer", "SubDPS"],
  kaeya: ["SubDPS"],
  "kamisato-ayaka": ["MainDPS"],
  "kamisato-ayato": ["MainDPS"],
  kaveh: ["MainDPS"],
  keqing: ["MainDPS"],
  kinich: ["MainDPS"],
  kirara: ["Shielder", "SubDPS"],
  klee: ["MainDPS"],
  "kujou-sara": ["Buffer", "SubDPS"],
  "kuki-shinobu": ["Healer", "SubDPS"],
  "lan-yan": ["Shielder", "Buffer"],
  lauma: ["SubDPS", "Buffer"],
  layla: ["Shielder", "SubDPS"],
  linnea: ["SubDPS", "Healer"],
  lisa: ["SubDPS"],
  lohen: ["MainDPS"],
  lynette: ["SubDPS"],
  lyney: ["MainDPS"],
  mavuika: ["MainDPS"],
  mika: ["Buffer", "Healer"],
  mona: ["SubDPS", "Buffer"],
  mualani: ["MainDPS"],
  nahida: ["SubDPS", "Buffer"],
  navia: ["MainDPS"],
  nefer: ["MainDPS"],
  neuvillette: ["MainDPS"],
  nicole: ["Shielder", "Buffer"],
  nilou: ["SubDPS", "Buffer"],
  ningguang: ["SubDPS"],
  noelle: ["MainDPS", "Healer"],
  ororon: ["SubDPS", "Battery"],
  prune: ["Buffer"],
  qiqi: ["Healer"],
  "raiden-shogun": ["SubDPS", "Battery"],
  razor: ["MainDPS"],
  rosaria: ["SubDPS", "Buffer"],
  "sangonomiya-kokomi": ["Healer", "SubDPS"],
  sayu: ["Healer", "Buffer"],
  sethos: ["SubDPS"],
  shenhe: ["Buffer", "SubDPS"],
  "shikanoin-heizou": ["MainDPS"],
  sigewinne: ["Healer", "SubDPS"],
  skirk: ["MainDPS"],
  sucrose: ["Buffer", "Battery"],
  tartaglia: ["MainDPS"],
  thoma: ["Shielder", "SubDPS"],
  tighnari: ["MainDPS"],
  varesa: ["MainDPS"],
  varka: ["MainDPS"],
  venti: ["Buffer", "Battery"],
  wanderer: ["MainDPS"],
  wriothesley: ["MainDPS"],
  xiangling: ["SubDPS"],
  xianyun: ["Buffer", "Healer"],
  xiao: ["MainDPS"],
  xilonen: ["Buffer", "Healer"],
  xingqiu: ["SubDPS"],
  xinyan: ["SubDPS", "Shielder"],
  "yae-miko": ["SubDPS"],
  yanfei: ["MainDPS"],
  yaoyao: ["Healer", "SubDPS"],
  yelan: ["SubDPS"],
  yoimiya: ["MainDPS"],
  "yumemizuki-mizuki": ["Buffer", "SubDPS"],
  "yun-jin": ["Buffer", "SubDPS"],
  zhongli: ["Shielder", "SubDPS"],
  zibai: ["MainDPS"],
};

// Stat-granting 2-piece artifact bonuses (DMG bonuses first so "Pyro DMG" wins over "ATK").
const SET2PC: [string, string][] = [
  ["Pyro DMG", "PYRO_DMG"],
  ["Hydro DMG", "HYDRO_DMG"],
  ["Electro DMG", "ELECTRO_DMG"],
  ["Cryo DMG", "CRYO_DMG"],
  ["Anemo DMG", "ANEMO_DMG"],
  ["Geo DMG", "GEO_DMG"],
  ["Dendro DMG", "DENDRO_DMG"],
  ["Physical DMG", "PHYS_DMG"],
  ["Energy Recharge", "ER"],
  ["Elemental Mastery", "EM"],
  ["Healing Bonus", "HEAL_BONUS"],
  ["ATK", "ATK_PCT"],
  ["HP", "HP_PCT"],
  ["DEF", "DEF_PCT"],
];

function ascensionValue(key: string, specialized: number): number {
  return key === "EM" ? round(specialized) : round(specialized * 100);
}

/** Extract scaling rows from a genshin-db combat talent (labels + parameters). */
function scalingOf(combat: any): { label: string; valuesByLevel: number[]; percent: boolean }[] {
  const labels: string[] = combat?.attributes?.labels ?? [];
  const params: Record<string, number[]> = combat?.attributes?.parameters ?? {};
  const rows: { label: string; valuesByLevel: number[]; percent: boolean }[] = [];
  for (const label of labels) {
    const [name, template = ""] = String(label).split("|");
    const m = template.match(/\{(param\d+):([^}]*)\}/);
    if (!m) continue;
    const arr = params[m[1]!];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const percent = m[2]!.includes("P");
    const suffix = template.replace(/\{param\d+:[^}]*\}/g, "").replace(/\s+/g, " ").trim();
    rows.push({
      label: suffix ? `${name!.trim()} ${suffix}`.trim() : name!.trim(),
      valuesByLevel: arr.map((v) => round(percent ? v * 100 : v)),
      percent,
    });
  }
  return rows;
}

function firstContentLine(desc: unknown): string {
  const lines = String(desc ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const line = lines[1] ?? lines[0] ?? "";
  return line.length > 200 ? `${line.slice(0, 197)}…` : line;
}

function parse2pc(text: string): { key: string; value: number }[] {
  for (const [phrase, key] of SET2PC) {
    if (text.includes(phrase)) {
      const m = text.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) return [{ key, value: Number(m[1]) }];
    }
  }
  return [];
}

// --- Characters ---
const charNames = genshindb.characters("names", { matchCategories: true }) as string[];
const characters: any[] = [];
for (const name of charNames) {
  try {
    const c = genshindb.characters(name) as any;
    if (!c || (c.rarity !== 4 && c.rarity !== 5)) continue;
    if (!ELEMENTS.has(c.elementText) || !WEAPON_TYPES.has(c.weaponText)) continue;
    const key = SUBSTAT_TO_KEY[c.substatText];
    if (!key) continue;
    const s90 = c.stats(90, "6");
    const id = slug(c.name);
    // Per-level anchors at the ascension caps (FR-003): [level, ascension].
    const LEVEL_ASCENSION: [number, number][] = [
      [1, 0], [20, 1], [40, 2], [50, 3], [60, 4], [70, 5], [80, 6], [90, 6],
    ];
    const levels = LEVEL_ASCENSION.map(([lvl, asc]) => {
      const s = c.stats(lvl, String(asc));
      return { level: lvl, hp: round(s.hp), atk: round(s.attack), def: round(s.defense), ascensionStat: ascensionValue(key, s.specialized) };
    });
    const t = genshindb.talents(name) as any;
    const skill = (combat: any, type: string, iconFile?: string) =>
      combat
        ? {
            type,
            name: combat.name as string,
            icon: enkaUrl(iconFile),
            desc: firstContentLine(combat.description),
            scaling: scalingOf(combat),
          }
        : null;
    const skills = [
      skill(t?.combat1, "NormalAttack", t?.images?.filename_combat1),
      skill(t?.combat2, "ElementalSkill", t?.images?.filename_combat2),
      skill(t?.combat3, "ElementalBurst", t?.images?.filename_combat3),
    ].filter(Boolean);
    const con = genshindb.constellations(name) as any;
    const constellations = con
      ? [1, 2, 3, 4, 5, 6]
          .map((n) => {
            const node = con[`c${n}`];
            return node
              ? { level: n, name: node.name as string, icon: enkaUrl(con.images?.[`filename_c${n}`]), description: conText(node.description) }
              : null;
          })
          .filter(Boolean)
      : [];
    characters.push({
      id,
      name: c.name,
      element: c.elementText,
      weaponType: c.weaponText,
      rarity: c.rarity,
      icon: enkaUrl(c.images?.filename_icon),
      lv90: { hp: round(s90.hp), atk: round(s90.attack), def: round(s90.defense) },
      ascensionStat: { key, value: ascensionValue(key, s90.specialized) },
      levels,
      roles: ROLE_OVERRIDES[id] ?? ["MainDPS"],
      skills,
      constellations,
      title: c.title ?? "",
      description: c.description ?? "",
      affiliation: c.affiliation ?? "",
      region: c.region ?? "",
      constellation: c.constellation ?? "",
      cv: c.cv?.english ?? "",
      version: String(c.version ?? ""),
      // Vertical wish-preview art (320x1024) — ideal for team-builder portrait columns.
      splashArt: enkaUrl(c.images?.filename_gachaSlice),
    });
  } catch {
    /* skip non-importable entries (e.g. unreleased/variant) */
  }
}

// --- Weapons (4/5 star) ---
const weaponNames = genshindb.weapons("names", { matchCategories: true }) as string[];
const weapons: any[] = [];
for (const name of weaponNames) {
  try {
    const w = genshindb.weapons(name) as any;
    // Include 3–5★ weapons (3★ are valid budget/early options; skip 1–2★ trash).
    if (!w || w.rarity < 3 || w.rarity > 5) continue;
    if (!WEAPON_TYPES.has(w.weaponText)) continue;
    const s90 = w.stats(90, "6");
    const s1 = w.stats(1, "0");
    const secKey = SUBSTAT_TO_KEY[w.mainStatText];
    weapons.push({
      id: slug(w.name),
      name: w.name,
      weaponType: w.weaponText,
      rarity: w.rarity,
      icon: enkaUrl(w.images?.filename_icon),
      awakenIcon: enkaUrl(w.images?.filename_awakenIcon),
      splashArt: enkaUrl(w.images?.filename_gacha),
      baseATK: round(s90.attack),
      baseATKMin: round(s1.attack),
      ...(secKey
        ? {
            secondaryStat: { key: secKey, value: ascensionValue(secKey, s90.specialized) },
            secondaryStatMin: ascensionValue(secKey, s1.specialized),
          }
        : {}),
      passiveStatBonuses: [],
      ...(w.effectName
        ? {
            passive: {
              name: String(w.effectName),
              template: stripTags(String(w.effectTemplateRaw ?? "")),
              refinements: [w.r1, w.r2, w.r3, w.r4, w.r5].map((r: any) => (r?.values ?? []).map(String)),
            },
          }
        : {}),
      description: String(w.description ?? ""),
      story: String(w.story ?? ""),
      version: String(w.version ?? ""),
    });
  } catch {
    /* skip */
  }
}

// --- Artifact sets (5-piece) ---
const PIECE_SLOTS: [string, string][] = [
  ["flower", "Flower"],
  ["plume", "Plume"],
  ["sands", "Sands"],
  ["goblet", "Goblet"],
  ["circlet", "Circlet"],
];
const artifactNames = genshindb.artifacts("names", { matchCategories: true }) as string[];
const artifactSets: any[] = [];
for (const name of artifactNames) {
  try {
    const a = genshindb.artifacts(name) as any;
    if (!a || !a.flower || !a.circlet) continue;
    if (Array.isArray(a.rarityList) && !a.rarityList.includes(5)) continue;
    artifactSets.push({
      id: slug(a.name),
      name: a.name,
      icon: enkaUrl(a.images?.filename_flower ?? a.images?.filename_circlet),
      bonus2: { description: String(a.effect2Pc ?? ""), statBonuses: parse2pc(String(a.effect2Pc ?? "")) },
      bonus4: { description: String(a.effect4Pc ?? ""), statBonuses: [] },
      version: String(a.version ?? ""),
      rarities: Array.isArray(a.rarityList) ? a.rarityList.filter((r: any) => typeof r === "number") : [],
      // The five named pieces, each with its own art + flavor text.
      pieces: PIECE_SLOTS.filter(([k]) => a[k]).map(([k, slot]) => ({
        slot,
        name: String(a[k].name ?? ""),
        icon: enkaUrl(a.images?.[`filename_${k}`]),
        description: String(a[k].description ?? ""),
      })),
    });
  } catch {
    /* skip */
  }
}

// --- Meta (curves + slot rules + canonical stat values; version-independent constants) ---
const meta = {
  meta: { gameVersion: "genshin-db-5", datasetVersion: "2026.06", generatedAt: "2026-06-25T00:00:00.000Z" },
  curves: { endgame: { "90": 1 } },
  slotStatRules: {
    allowedMainStats: {
      Flower: ["HP"],
      Plume: ["ATK"],
      Sands: ["HP_PCT", "ATK_PCT", "DEF_PCT", "EM", "ER"],
      Goblet: ["HP_PCT", "ATK_PCT", "DEF_PCT", "EM", "PYRO_DMG", "HYDRO_DMG", "ELECTRO_DMG", "CRYO_DMG", "ANEMO_DMG", "GEO_DMG", "DENDRO_DMG", "PHYS_DMG"],
      Circlet: ["HP_PCT", "ATK_PCT", "DEF_PCT", "EM", "CRIT_RATE", "CRIT_DMG", "HEAL_BONUS"],
    },
    allowedSubStats: ["HP", "HP_PCT", "ATK", "ATK_PCT", "DEF", "DEF_PCT", "EM", "CRIT_RATE", "CRIT_DMG", "ER"],
  },
  statValues: {
    mainStatValues: {
      HP: 4780, ATK: 311, HP_PCT: 46.6, ATK_PCT: 46.6, DEF_PCT: 58.3, EM: 187, ER: 51.8,
      CRIT_RATE: 31.1, CRIT_DMG: 62.2, HEAL_BONUS: 35.9, PYRO_DMG: 46.6, HYDRO_DMG: 46.6,
      ELECTRO_DMG: 46.6, CRYO_DMG: 46.6, ANEMO_DMG: 46.6, GEO_DMG: 46.6, DENDRO_DMG: 46.6, PHYS_DMG: 58.3,
    },
    subStatValues: {
      HP: [209.1, 239.0, 268.9, 298.8], ATK: [13.6, 15.6, 17.5, 19.5], DEF: [16.2, 18.5, 20.8, 23.2],
      HP_PCT: [4.1, 4.7, 5.2, 5.8], ATK_PCT: [4.1, 4.7, 5.2, 5.8], DEF_PCT: [5.1, 5.8, 6.6, 7.3],
      EM: [16.3, 18.7, 21.0, 23.3], ER: [4.5, 5.2, 5.8, 6.5], CRIT_RATE: [2.7, 3.1, 3.5, 3.9],
      CRIT_DMG: [5.4, 6.2, 7.0, 7.8],
    },
  },
};

mkdirSync(OUT_DIR, { recursive: true });
const write = (file: string, data: unknown) => writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 0));
// genshin-db can list the same entry more than once (e.g. story-variant swords like the
// "Prized Isshin Blade" appear 3x); keep the first of each id so the app never shows dupes.
const dedupeById = (arr: any[]) => {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
};
characters.sort((a, b) => a.name.localeCompare(b.name));
weapons.sort((a, b) => a.name.localeCompare(b.name));
artifactSets.sort((a, b) => a.name.localeCompare(b.name));
const outChars = dedupeById(characters);
const outWeapons = dedupeById(weapons);
const outSets = dedupeById(artifactSets);
write("characters.json", outChars);
write("weapons.json", outWeapons);
write("artifact-sets.json", outSets);
write("meta.json", meta);
console.log(`Imported ${outChars.length} characters, ${outWeapons.length} weapons, ${outSets.length} artifact sets -> ${OUT_DIR}`);
