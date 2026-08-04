import { computeBaseStats, estimateTeamDamage } from "@app/stat-engine";
import type { DamageMember } from "@app/stat-engine";
import type { DamageEstimate, Element } from "@app/contracts";
import type { CharacterDetail, SavedLoadout } from "./api";
import { teamBuffFor, resShredForElement } from "./teamBuffs";

/** An illustrative rotation (A4): the strongest %-DMG instance of each combat talent, at Lv10. */
function rotationInstances(character: CharacterDetail["character"]): { label: string; multiplier: number }[] {
  const LABELS: Record<string, string> = {
    NormalAttack: "Normal Attack",
    ElementalSkill: "Elemental Skill",
    ElementalBurst: "Elemental Burst",
  };
  const valueAt = (row: { valuesByLevel: number[] }) =>
    row.valuesByLevel[9] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
  const out: { label: string; multiplier: number }[] = [];
  for (const s of character.skills) {
    const dmgRows = s.scaling.filter((r) => r.percent && /DMG/i.test(r.label));
    if (!dmgRows.length) continue;
    const best = dmgRows.reduce((a, b) => (valueAt(b) > valueAt(a) ? b : a));
    out.push({ label: LABELS[s.type] ?? s.name, multiplier: valueAt(best) });
  }
  return out.length ? out : [{ label: "Rotation", multiplier: 200 }];
}

/** Damage inputs from a character's base stats (no gear). */
export function deriveFromBase(detail: CharacterDetail): DamageMember {
  const base = computeBaseStats(detail.character, 90, 6, detail.curves);
  const dmgBonusPct = Object.entries(base.sheet)
    .filter(([k]) => k.endsWith("_DMG"))
    .reduce((sum, [, v]) => sum + v, 0);
  return {
    characterId: detail.character.id,
    finalATK: base.baseATK,
    critRate: base.sheet.CRIT_RATE,
    critDmg: base.sheet.CRIT_DMG,
    dmgBonusPct,
    em: base.sheet.EM ?? 0,
    element: detail.character.element,
    talentMultiplier: 200,
    instances: rotationInstances(detail.character),
    characterLevel: 90,
  };
}

/** Damage inputs from a saved loadout's geared final stats (FR-017). */
export function deriveFromLoadout(lo: SavedLoadout, character: CharacterDetail["character"]): DamageMember {
  const get = (k: string) => lo.computedFinalStats.find((s) => s.key === k)?.value ?? 0;
  const dmgBonusPct = lo.computedFinalStats
    .filter((s) => s.key.endsWith("_DMG"))
    .reduce((sum, s) => sum + s.value, 0);
  return {
    characterId: lo.characterId,
    finalATK: get("ATK"),
    critRate: get("CRIT_RATE"),
    critDmg: get("CRIT_DMG"),
    dmgBonusPct,
    em: get("EM"),
    element: character.element,
    talentMultiplier: 200,
    instances: rotationInstances(character),
    characterLevel: 90,
  };
}

/** Amplifying-reaction presets applied to every member as a rough estimate assumption. */
export const REACTIONS: Record<string, { label: string; mult: number; type?: string }> = {
  none: { label: "No reaction", mult: 1 },
  "vaporize-2": { label: "Vaporize (2×)", mult: 2, type: "Vaporize" },
  "vaporize-1.5": { label: "Vaporize (1.5×)", mult: 1.5, type: "Vaporize" },
  "melt-2": { label: "Melt (2×)", mult: 2, type: "Melt" },
  "melt-1.5": { label: "Melt (1.5×)", mult: 1.5, type: "Melt" },
};

export interface TeamDamageEntry {
  detail: CharacterDetail;
  loadout?: SavedLoadout | null;
}

export interface TeamDamageOpts {
  reaction: string;
  transformative: string;
  enemyLevel: number;
  enemyRes: number;
  /** Per-element base RES from an enemy preset (before shred). */
  presetByElement?: Record<string, number>;
}

/** Compute a team's damage estimate + the per-element effective RES it used (C). Shared by the
 *  team builder and team compare. Each entry uses its geared loadout stats if present, else base. */
export function computeTeamDamage(
  entries: TeamDamageEntry[],
  opts: TeamDamageOpts,
): { damage: DamageEstimate | null; resReadout: { element: Element; res: number }[] } {
  const teamCharIds = entries.map((e) => e.detail.character.id);
  const r = REACTIONS[opts.reaction] ?? { mult: 1, type: undefined };

  const dmg = entries
    .map((e) => (e.loadout ? deriveFromLoadout(e.loadout, e.detail.character) : deriveFromBase(e.detail)))
    // Fold in team-wide buffs (A2), then the amplifying reaction.
    .map((m) => {
      const buff = teamBuffFor(m.element, teamCharIds);
      return {
        ...m,
        finalATK: m.finalATK + buff.flatATK,
        dmgBonusPct: m.dmgBonusPct + buff.dmgBonusPct,
        critRate: m.critRate + buff.critRate,
        critDmg: m.critDmg + buff.critDmg,
        reactionMultiplier: r.mult,
        reactionType: r.type,
      };
    });

  // Transformative reaction (A6): a separate flat-DMG line credited to the highest-EM member.
  if (opts.transformative !== "none" && dmg.length) {
    let bestIdx = 0;
    let bestEm = -1;
    dmg.forEach((m, i) => {
      const em = m.em ?? 0;
      if (em > bestEm) {
        bestEm = em;
        bestIdx = i;
      }
    });
    const bm = dmg[bestIdx];
    if (bm) dmg[bestIdx] = { ...bm, transformative: opts.transformative };
  }

  // Per-element effective RES (C): VV shreds swirlable only, Zhongli universal.
  const teamElements = [...new Set(dmg.map((m) => m.element).filter(Boolean))] as Element[];
  const byElement: Record<string, number> = {};
  for (const el of teamElements) {
    byElement[el] = (opts.presetByElement?.[el] ?? opts.enemyRes) - resShredForElement(teamCharIds, el);
  }
  const resReadout = teamElements
    .map((el) => ({ element: el, res: byElement[el]! }))
    .sort((a, b) => a.element.localeCompare(b.element));

  const damage = dmg.length
    ? estimateTeamDamage(dmg, {
        enemyLevel: opts.enemyLevel,
        enemyResistancePct: opts.enemyRes - resShredForElement(teamCharIds, undefined),
        enemyResistanceByElement: byElement,
      })
    : null;

  return { damage, resReadout };
}
