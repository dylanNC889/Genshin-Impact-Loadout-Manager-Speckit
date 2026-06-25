const PERCENT_KEYS = new Set(["CRIT_RATE", "CRIT_DMG", "ER", "HEAL_BONUS"]);

export const STAT_LABELS: Record<string, string> = {
  HP: "Max HP",
  ATK: "ATK",
  DEF: "DEF",
  CRIT_RATE: "CRIT Rate",
  CRIT_DMG: "CRIT DMG",
  EM: "Elemental Mastery",
  ER: "Energy Recharge",
  HP_PCT: "HP%",
  ATK_PCT: "ATK%",
  DEF_PCT: "DEF%",
  HEAL_BONUS: "Healing Bonus",
};

/** Format a stat value: EM is flat, percent/DMG/recharge stats get a % suffix. */
export function formatStat(key: string, value: number): string {
  if (key === "EM") return String(Math.round(value));
  if (PERCENT_KEYS.has(key) || key.endsWith("_PCT") || key.endsWith("_DMG")) {
    return `${value.toFixed(1)}%`;
  }
  return String(Math.round(value));
}

/** Human label for a stat key, falling back to a readable transform of the key. */
export function statLabel(key: string): string {
  return STAT_LABELS[key] ?? key.replace("_DMG", " DMG Bonus").replace("_", " ");
}
