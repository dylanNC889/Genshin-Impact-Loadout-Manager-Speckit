import type { Element } from "@app/contracts";

/**
 * Approximate team-wide combat buffs from common enablers, folded into the on-demand damage
 * estimate (A2). Values are representative approximations (assume ~C0 + a support build, 100%
 * uptime) — the point is that a team WITH Bennett/Kazuha/etc. estimates materially higher than
 * without, not a frame-perfect number.
 */
export interface TeamBuff {
  /** Flat ATK buff (e.g. Bennett's field). */
  flatATK?: number;
  dmgBonusPct?: number;
  critRate?: number;
  critDmg?: number;
  /** Enemy RES shred — global (benefits the whole team). */
  resShredPct?: number;
  /** When set, the offensive buffs apply only to this element's damage. */
  element?: Element;
  note: string;
}

export const TEAM_BUFFS: Record<string, TeamBuff> = {
  bennett: { flatATK: 800, note: "Bennett: ATK field (~+800 ATK, approx)" },
  "kaedehara-kazuha": { resShredPct: 40, dmgBonusPct: 20, note: "Kazuha: VV −40% RES + EM DMG% (approx)" },
  sucrose: { resShredPct: 40, dmgBonusPct: 20, note: "Sucrose: VV −40% RES + EM share (approx)" },
  venti: { resShredPct: 40, note: "Venti: VV −40% RES" },
  lynette: { resShredPct: 40, note: "Lynette: VV −40% RES" },
  faruzan: { dmgBonusPct: 30, element: "Anemo", note: "Faruzan: +Anemo DMG & RES shred (approx)" },
  zhongli: { resShredPct: 20, note: "Zhongli: −20% universal RES" },
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

/** Global enemy RES shred from the team (capped). */
export function teamResShred(teamIds: string[]): number {
  const shred = teamIds.reduce((sum, id) => sum + (TEAM_BUFFS[id]?.resShredPct ?? 0), 0);
  return Math.min(shred, 60);
}

/** Human notes for the active team buffs (for the assumptions display). */
export function activeBuffNotes(teamIds: string[]): string[] {
  return teamIds.map((id) => TEAM_BUFFS[id]?.note).filter((n): n is string => Boolean(n));
}
