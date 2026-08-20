import type { Element, ResShred } from "@app/contracts";
import { totalResShred } from "@app/stat-engine";

/**
 * Approximate team-wide combat buffs from common enablers, folded into the live damage estimate
 * (A2 + C). Values are representative approximations (assume ~C0 + a support build, 100% uptime) —
 * the point is that a team WITH Bennett/Kazuha/etc. estimates materially higher than without.
 */
export interface TeamBuff {
  /** Flat ATK buff (e.g. Bennett's field). */
  flatATK?: number;
  dmgBonusPct?: number;
  critRate?: number;
  critDmg?: number;
  /** Enemy RES shred; `elements` scopes it (undefined = universal). VV shreds swirlable only.
   *  `source` de-duplicates against the same effect reached another way — a build wearing VV 4pc
   *  contributes an identically-sourced shred, and the two take the max instead of stacking. */
  resShred?: ResShred;
  /** When set, the offensive buffs apply only to this element's damage. */
  element?: Element;
  note: string;
}

/** Elements an Anemo unit can swirl (what Viridescent Venerer's 4pc shreds). */
const SWIRLABLE: Element[] = ["Pyro", "Hydro", "Electro", "Cryo"];

/** Shared shred source id — must match the `source` on the vv4 conditional buff in
 *  data/modifiers/conditional-buffs.json, so the two never double-count. */
const VV = "viridescent-venerer";

export const TEAM_BUFFS: Record<string, TeamBuff> = {
  bennett: { flatATK: 800, note: "Bennett: ATK field (~+800 ATK, approx)" },
  "kujou-sara": { flatATK: 500, note: "Kujou Sara: Crowfeather ATK buff (approx)" },
  "kaedehara-kazuha": {
    resShred: { pct: 40, elements: SWIRLABLE, source: VV },
    dmgBonusPct: 20,
    note: "Kazuha: VV −40% RES (swirled elements) + EM DMG% (approx)",
  },
  sucrose: { resShred: { pct: 40, elements: SWIRLABLE, source: VV }, dmgBonusPct: 20, note: "Sucrose: VV −40% RES + EM share (approx)" },
  venti: { resShred: { pct: 40, elements: SWIRLABLE, source: VV }, note: "Venti: VV −40% RES (swirled elements)" },
  lynette: { resShred: { pct: 40, elements: SWIRLABLE, source: VV }, note: "Lynette: VV −40% RES (swirled elements)" },
  faruzan: { dmgBonusPct: 30, element: "Anemo", note: "Faruzan: +Anemo DMG & RES shred (approx)" },
  zhongli: { resShred: { pct: 20, source: "zhongli" }, note: "Zhongli: −20% universal RES" },
  furina: { dmgBonusPct: 60, note: "Furina: Fanfare team DMG% (approx, high stacks)" },
  mona: { dmgBonusPct: 60, note: "Mona: Omen +DMG taken (approx)" },
  yelan: { dmgBonusPct: 25, note: "Yelan: Exquisiteness +DMG% (approx)" },
  shenhe: { dmgBonusPct: 15, element: "Cryo", note: "Shenhe: +Cryo DMG (approx)" },
  gorou: { dmgBonusPct: 15, element: "Geo", note: "Gorou: +Geo DMG (approx)" },
  nahida: { note: "Nahida: team EM buff (not modeled in this ATK-based estimate)" },
};

/** Sum of offensive buffs applying to a member of `element` from the team's enablers. */
export function teamBuffFor(
  element: string | undefined,
  teamIds: string[],
): { flatATK: number; dmgBonusPct: number; critRate: number; critDmg: number } {
  let flatATK = 0;
  let dmgBonusPct = 0;
  let critRate = 0;
  let critDmg = 0;
  for (const id of teamIds) {
    const b = TEAM_BUFFS[id];
    if (!b) continue;
    if (b.element && b.element !== element) continue;
    flatATK += b.flatATK ?? 0;
    dmgBonusPct += b.dmgBonusPct ?? 0;
    critRate += b.critRate ?? 0;
    critDmg += b.critDmg ?? 0;
  }
  return { flatATK, dmgBonusPct, critRate, critDmg };
}

/** Enemy RES shred applying to `element`, from the team's enablers plus any `extra` shreds the
 *  caller resolved elsewhere (e.g. a build's own VV/Deepwood 4pc via its conditional buffs).
 *  Scoping, same-source de-duplication and the 60-point cap all live in the engine's
 *  totalResShred so team buffs and conditional buffs are resolved by one set of rules. */
export function resShredForElement(
  teamIds: string[],
  element: Element | undefined,
  extra: ResShred[] = [],
): number {
  const fromTeam = teamIds.map((id) => TEAM_BUFFS[id]?.resShred).filter((rs): rs is ResShred => Boolean(rs));
  return totalResShred([...fromTeam, ...extra], element);
}

/** Human notes for the active team buffs (for the assumptions display). */
export function activeBuffNotes(teamIds: string[]): string[] {
  return teamIds.map((id) => TEAM_BUFFS[id]?.note).filter((n): n is string => Boolean(n));
}
