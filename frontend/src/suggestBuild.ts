import type {
  ArtifactSet,
  ArtifactSlot,
  ArtifactSubStat,
  Character,
  SlotStatRules,
  StatKey,
  StatValuesTable,
  Weapon,
} from "@app/contracts";
import { recommendedFor } from "./recommendations";

/**
 * A heuristic "optimised build" suggestion: the top KQM-recommended weapon + artifact set,
 * plus main stats derived from the character's build-scaling stat / element / role. It's a
 * sensible starting point, not a guarantee — the player can tweak everything after applying.
 */

/** Characters whose damage/healing builds around a stat other than ATK (well-known picks). */
const HP_SCALERS = new Set([
  "hu-tao", "yelan", "sangonomiya-kokomi", "nilou", "neuvillette", "furina", "mualani",
  "sigewinne", "barbara", "zhongli", "baizhu", "yaoyao", "kirara", "candace", "layla",
]);
const DEF_SCALERS = new Set(["noelle", "albedo", "arataki-itto", "chiori", "gorou", "kachina"]);
const EM_SCALERS = new Set([
  "nahida", "sucrose", "kaedehara-kazuha", "sethos", "alhaitham", "kuki-shinobu", "yumemizuki-mizuki",
]);
/** Can't (usefully) crit — want a Healing/HP circlet and no CRIT substats. */
const NO_CRIT = new Set(["sangonomiya-kokomi"]);
/** Energy-hungry — want an ER Sands to fund their Burst. */
const ER_HUNGRY = new Set(["raiden-shogun", "bennett", "xiangling", "sucrose", "kujou-sara"]);

type BuildStat = "ATK" | "HP" | "DEF" | "EM";
function buildStatOf(id: string): BuildStat {
  if (HP_SCALERS.has(id)) return "HP";
  if (DEF_SCALERS.has(id)) return "DEF";
  if (EM_SCALERS.has(id)) return "EM";
  return "ATK";
}

const ELEMENT_DMG: Record<string, StatKey> = {
  Pyro: "PYRO_DMG", Hydro: "HYDRO_DMG", Electro: "ELECTRO_DMG", Cryo: "CRYO_DMG",
  Anemo: "ANEMO_DMG", Geo: "GEO_DMG", Dendro: "DENDRO_DMG",
};

const PCT: Record<BuildStat, StatKey> = { ATK: "ATK_PCT", HP: "HP_PCT", DEF: "DEF_PCT", EM: "EM" };

export interface BuildSuggestion {
  weaponId: string | null;
  weaponName: string | null;
  setId: string | null;
  setName: string | null;
  /** Recommended main stat per slot. */
  mains: Record<ArtifactSlot, StatKey>;
  /** Ordered substat priority (display only). */
  substats: string[];
  /** Same priority as stat keys, for auto-filling artifact substats on Apply. */
  substatKeys: StatKey[];
  curated: boolean;
}

const SLOTS: ArtifactSlot[] = ["Flower", "Plume", "Sands", "Goblet", "Circlet"];

/** Clamp a preferred main stat to what the slot actually allows, else the slot's first option. */
function pickMain(slot: ArtifactSlot, preferred: StatKey, rules: SlotStatRules): StatKey {
  const allowed = rules.allowedMainStats[slot] ?? [];
  if (allowed.includes(preferred)) return preferred;
  return allowed[0] ?? preferred;
}

export function suggestBuild(
  character: Character,
  weapons: Weapon[],
  sets: ArtifactSet[],
  rules: SlotStatRules,
): BuildSuggestion {
  const recs = recommendedFor(character, weapons, sets);
  const weaponId = recs.weaponIds[0] ?? null;
  const setId = recs.setIds[0] ?? null;
  const bs = buildStatOf(character.id);
  const isHealer = character.roles.includes("Healer");
  const pureHealer = character.roles.length === 1 && character.roles[0] === "Healer";
  const noCrit = NO_CRIT.has(character.id);
  const erHungry = ER_HUNGRY.has(character.id);

  const sands = erHungry ? "ER" : PCT[bs];
  const goblet = bs === "EM" ? "EM" : (ELEMENT_DMG[character.element] ?? "ATK_PCT");
  // No-crit units want a Healing/HP circlet, not CRIT.
  const circlet: StatKey =
    pureHealer || noCrit ? (isHealer ? "HEAL_BONUS" : PCT[bs]) : bs === "EM" ? "EM" : "CRIT_DMG";

  const preferred: Record<ArtifactSlot, StatKey> = {
    Flower: "HP", Plume: "ATK", Sands: sands, Goblet: goblet, Circlet: circlet,
  };
  const mains = Object.fromEntries(
    SLOTS.map((s) => [s, pickMain(s, preferred[s], rules)]),
  ) as Record<ArtifactSlot, StatKey>;

  const crit = "CRIT Rate / CRIT DMG";
  const scale = bs === "ATK" ? "ATK%" : bs === "HP" ? "HP%" : bs === "DEF" ? "DEF%" : "Elemental Mastery";
  const scaleSub: StatKey = PCT[bs];
  const erLead = erHungry ? "Energy Recharge, " : "";
  const substats = noCrit
    ? [`${scale}`, "Energy Recharge", "Elemental Mastery"]
    : pureHealer
      ? ["HP%", "Energy Recharge", "CRIT Rate / CRIT DMG"]
      : bs === "EM"
        ? ["Elemental Mastery", crit, "Energy Recharge"]
        : [`${erLead}${crit}`, scale, "Energy Recharge"];

  const substatKeys: StatKey[] = noCrit
    ? [scaleSub, "ER", "EM", "HP_PCT", "ATK_PCT"]
    : pureHealer
      ? ["HP_PCT", "ER", "CRIT_RATE", "CRIT_DMG", "EM"]
      : bs === "EM"
        ? ["EM", "CRIT_RATE", "CRIT_DMG", "ER", "ATK_PCT"]
        : ["CRIT_RATE", "CRIT_DMG", scaleSub, "ER", "EM"];

  return {
    weaponId,
    weaponName: weapons.find((w) => w.id === weaponId)?.name ?? null,
    setId,
    setName: sets.find((s) => s.id === setId)?.name ?? null,
    mains,
    substats,
    substatKeys,
    curated: recs.curated,
  };
}

/**
 * Build four well-rolled substats for a slot: one base roll each, then the artifact's four
 * shared upgrade rolls loaded onto CRIT (or the scaling stat when there's no CRIT). Skips the
 * slot's main stat (a substat can't duplicate it).
 */
export function buildSubStats(
  substatKeys: StatKey[],
  mainKey: StatKey,
  subStatValues: StatValuesTable["subStatValues"],
): ArtifactSubStat[] {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const high = (k: StatKey) => {
    const rolls = subStatValues[k] ?? [];
    return rolls[rolls.length - 1] ?? 0;
  };
  const chosen = substatKeys
    .filter((k) => k !== mainKey && (subStatValues[k]?.length ?? 0) > 0)
    .slice(0, 4);
  const subs: ArtifactSubStat[] = chosen.map((k) => ({ key: k, rollValues: [high(k)], value: round1(high(k)) }));

  // Distribute the 4 shared upgrade rolls: CRIT first, then whatever's chosen, 2 at a time.
  const order = (["CRIT_DMG", "CRIT_RATE", ...chosen] as StatKey[]).filter((k, i, a) => a.indexOf(k) === i);
  let upgrades = 4;
  for (const k of order) {
    if (upgrades <= 0) break;
    const sub = subs.find((s) => s.key === k);
    if (!sub) continue;
    const add = Math.min(2, upgrades);
    for (let n = 0; n < add; n++) sub.rollValues.push(high(k));
    sub.value = round1(sub.rollValues.reduce((a, b) => a + b, 0));
    upgrades -= add;
  }
  return subs;
}
