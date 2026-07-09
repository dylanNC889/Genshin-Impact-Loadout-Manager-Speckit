import type { ArtifactSet, ArtifactSlot, Character, SlotStatRules, StatKey, Weapon } from "@app/contracts";
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
  const pureHealer = character.roles.length === 1 && character.roles[0] === "Healer";

  const sands = PCT[bs];
  const goblet = bs === "EM" ? "EM" : (ELEMENT_DMG[character.element] ?? "ATK_PCT");
  const circlet: StatKey = pureHealer ? "HEAL_BONUS" : bs === "EM" ? "EM" : "CRIT_DMG";

  const preferred: Record<ArtifactSlot, StatKey> = {
    Flower: "HP", Plume: "ATK", Sands: sands, Goblet: goblet, Circlet: circlet,
  };
  const mains = Object.fromEntries(
    SLOTS.map((s) => [s, pickMain(s, preferred[s], rules)]),
  ) as Record<ArtifactSlot, StatKey>;

  const crit = "CRIT Rate / CRIT DMG";
  const scale = bs === "ATK" ? "ATK%" : bs === "HP" ? "HP%" : bs === "DEF" ? "DEF%" : "Elemental Mastery";
  const substats = pureHealer
    ? ["HP%", "Energy Recharge", "CRIT Rate / CRIT DMG"]
    : bs === "EM"
      ? ["Elemental Mastery", crit, "Energy Recharge"]
      : [crit, scale, "Energy Recharge"];

  return {
    weaponId,
    weaponName: weapons.find((w) => w.id === weaponId)?.name ?? null,
    setId,
    setName: sets.find((s) => s.id === setId)?.name ?? null,
    mains,
    substats,
    curated: recs.curated,
  };
}
