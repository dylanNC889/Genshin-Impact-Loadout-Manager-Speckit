import type { Character, TalentLevels, TalentScope } from "@app/contracts";

/**
 * Enumerating a character's computable damage hits (batch 7 #9).
 *
 * The character page's rotation builder and the team damage estimate must agree on what a hit
 * "is" — same id, same multiplier, same talent scope — or a rotation saved on one would resolve
 * to something different on the other. So the enumeration lives here rather than inside the
 * character page, and both read it.
 */

/** The scaling stat genshin-db appends to a row's label, mapped to our stat keys. */
export const SCALE_STAT_TO_KEY: Record<string, string> = { ATK: "ATK", "Max HP": "HP", DEF: "DEF" };

// genshin-db appends the scaling stat to a row's label for non-ATK scalers ("Skill DMG Max HP",
// "… DMG DEF"); ATK-scaling DMG rows carry no suffix. Extract that trailing stat (or default a
// DMG row to ATK) so a row can read "Skill DMG: 46.6% of Max HP" (#7).
const SCALE_STAT_RX = /\s*:?\s*(Max HP|HP|DEF|ATK|Elemental Mastery|EM)\s*[+/]*\s*$/i;

function normScaleStat(s: string): string {
  const u = s.toUpperCase();
  if (u.includes("HP")) return "Max HP";
  if (u === "DEF") return "DEF";
  if (u === "ATK") return "ATK";
  return "EM";
}

export function describeScaling(label: string, percent: boolean): { label: string; stat: string | null } {
  if (!percent || !/DMG/i.test(label)) return { label, stat: null };
  const m = label.match(SCALE_STAT_RX);
  if (m) {
    const cleaned = label.slice(0, m.index).replace(/[\s:/+]+$/, "").trim();
    return { label: cleaned || label, stat: normScaleStat(m[1] ?? "") };
  }
  return { label, stat: "ATK" };
}

/** Short prefix for a hit's label. */
export const TYPE_ABBR: Record<string, string> = {
  NormalAttack: "NA",
  ElementalSkill: "Skill",
  ElementalBurst: "Burst",
};

const SCOPES: Record<string, TalentScope> = {
  NormalAttack: "NormalAttack",
  ElementalSkill: "ElementalSkill",
  ElementalBurst: "ElementalBurst",
};

/** The level configured for a talent; non-combat rows follow the Normal Attack level. */
export function levelForTalent(talentLevels: TalentLevels, talentType: string): number {
  if (talentType === "ElementalSkill") return talentLevels.ElementalSkill;
  if (talentType === "ElementalBurst") return talentLevels.ElementalBurst;
  return talentLevels.NormalAttack;
}

export interface TalentHit {
  /** `${skillId}-${rowIndex}` — the id a saved rotation line refers to. */
  id: string;
  talentType: string;
  /** "Skill · Blood Blossom DMG" */
  label: string;
  /** Scaling percent at the talent's configured level. */
  multiplier: number;
  /** Which per-hit DMG% bucket applies — Charged Attack rows live under the NA talent. */
  scope?: TalentScope;
  /** "ATK" | "Max HP" | "DEF" | null — null means not a computable DMG row. */
  scaleStat: string | null;
}

/**
 * Every computable %-DMG hit a character has, at the given talent levels. Ids are stable across
 * talent levels and builds, so a saved rotation keeps resolving after either changes.
 */
export function talentHits(
  character: Pick<Character, "skills">,
  talentLevels: TalentLevels,
): TalentHit[] {
  const out: TalentHit[] = [];
  for (const s of character.skills) {
    const level = levelForTalent(talentLevels, s.type);
    s.scaling.forEach((row, i) => {
      const { label, stat } = describeScaling(row.label, row.percent);
      if (!stat || !row.percent) return;
      const multiplier = row.valuesByLevel[level - 1] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
      if (!multiplier) return;
      out.push({
        id: `${s.id}-${i}`,
        talentType: s.type,
        label: `${TYPE_ABBR[s.type] ?? s.type} · ${label}`,
        multiplier,
        // Charged Attack rows sit under the Normal Attack talent but are buffed by different
        // passives (Wanderer's Troupe vs Gladiator's Finale), so scope by the row.
        scope: s.type === "NormalAttack" && /charged/i.test(row.label) ? "ChargedAttack" : SCOPES[s.type],
        scaleStat: stat,
      });
    });
  }
  return out;
}
