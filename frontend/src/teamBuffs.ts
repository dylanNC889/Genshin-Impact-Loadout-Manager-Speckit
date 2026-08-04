import type { Element } from "@app/contracts";

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
  /** Enemy RES shred; `elements` scopes it (undefined = universal). VV shreds swirlable only. */
  resShred?: { pct: number; elements?: Element[] };
  /** When set, the offensive buffs apply only to this element's damage. */
  element?: Element;
  note: string;
}

/** Elements an Anemo unit can swirl (what Viridescent Venerer's 4pc shreds). */
const SWIRLABLE: Element[] = ["Pyro", "Hydro", "Electro", "Cryo"];

export const TEAM_BUFFS: Record<string, TeamBuff> = {
  bennett: { flatATK: 800, note: "Bennett: ATK field (~+800 ATK, approx)" },
  "kujou-sara": { flatATK: 500, note: "Kujou Sara: Crowfeather ATK buff (approx)" },
  "kaedehara-kazuha": {
    resShred: { pct: 40, elements: SWIRLABLE },
    dmgBonusPct: 20,
    note: "Kazuha: VV −40% RES (swirled elements) + EM DMG% (approx)",
  },
  sucrose: { resShred: { pct: 40, elements: SWIRLABLE }, dmgBonusPct: 20, note: "Sucrose: VV −40% RES + EM share (approx)" },
  venti: { resShred: { pct: 40, elements: SWIRLABLE }, note: "Venti: VV −40% RES (swirled elements)" },
  lynette: { resShred: { pct: 40, elements: SWIRLABLE }, note: "Lynette: VV −40% RES (swirled elements)" },
  faruzan: { dmgBonusPct: 30, element: "Anemo", note: "Faruzan: +Anemo DMG & RES shred (approx)" },
  zhongli: { resShred: { pct: 20 }, note: "Zhongli: −20% universal RES" },
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

/** Enemy RES shred that applies to `element` (element-scoped shred skipped when element is
 *  unknown). Capped at 60% — the game caps meaningful stacking around there. */
export function resShredForElement(teamIds: string[], element: Element | undefined): number {
  let shred = 0;
  for (const id of teamIds) {
    const rs = TEAM_BUFFS[id]?.resShred;
    if (!rs) continue;
    if (rs.elements) {
      if (!element || !rs.elements.includes(element)) continue;
    }
    shred += rs.pct;
  }
  return Math.min(shred, 60);
}

/** Human notes for the active team buffs (for the assumptions display). */
export function activeBuffNotes(teamIds: string[]): string[] {
  return teamIds.map((id) => TEAM_BUFFS[id]?.note).filter((n): n is string => Boolean(n));
}
