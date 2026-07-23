/**
 * Approximate Energy Recharge requirements (%) for energy-hungry characters (A10). These are the
 * widely-published community "solo" ER targets — a battery teammate (Raiden, Bennett, Fischl…)
 * lowers them substantially, and rotation length matters, so treat these as a rough guideline,
 * not a hard rule. Particle-generation data isn't in genshin-db, so this is curated end-values
 * rather than a computed model; characters absent here have no target shown.
 */
export const ER_REQUIREMENTS: Record<string, number> = {
  "raiden-shogun": 200,
  xiangling: 200,
  beidou: 200,
  "kujou-sara": 190,
  sucrose: 180,
  xingqiu: 180,
  yelan: 180,
  bennett: 170,
  "yae-miko": 160,
  rosaria: 160,
  diona: 160,
  chongyun: 160,
  fischl: 150,
  nahida: 150,
  jean: 140,
  venti: 140,
  "kaedehara-kazuha": 140,
  ganyu: 140,
  tartaglia: 140,
  "kamisato-ayato": 140,
  furina: 150,
  "hu-tao": 130,
  "kamisato-ayaka": 130,
  zhongli: 130,
  "sangonomiya-kokomi": 130,
};
