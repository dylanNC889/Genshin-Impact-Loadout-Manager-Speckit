import type { Dataset } from "@app/contracts";

/**
 * A small, fully controlled dataset for engine unit tests. Values are chosen so expected
 * outputs are exactly computable by hand — this verifies the calculation *math* (the
 * engine's job). Real in-game accuracy (SC-003) is a separate concern of the curated
 * dataset (task T014) and is asserted against real values there.
 */
export const testDataset: Dataset = {
  meta: { gameVersion: "test", datasetVersion: "0", generatedAt: "1970-01-01T00:00:00.000Z" },
  curves: {
    // factor of the level-1 base; level 90 => 12x.
    standard: { "1": 1, "20": 2, "40": 4.5, "60": 7, "80": 10, "90": 12 },
  },
  characters: [
    {
      id: "test-pyro",
      name: "Test Pyro",
      element: "Pyro",
      weaponType: "Claymore",
      rarity: 5,
      baseStats: { baseHP: 100, baseATK: 10, baseDEF: 8 },
      growthCurveId: "standard",
      ascensions: [
        { hpAdd: 50, atkAdd: 5, defAdd: 3, ascensionStat: { key: "CRIT_RATE", value: 0 } },
        { hpAdd: 150, atkAdd: 15, defAdd: 9, ascensionStat: { key: "CRIT_RATE", value: 0 } },
        { hpAdd: 250, atkAdd: 25, defAdd: 15, ascensionStat: { key: "CRIT_RATE", value: 4.8 } },
        { hpAdd: 350, atkAdd: 35, defAdd: 21, ascensionStat: { key: "CRIT_RATE", value: 9.6 } },
        { hpAdd: 430, atkAdd: 43, defAdd: 26, ascensionStat: { key: "CRIT_RATE", value: 14.4 } },
        { hpAdd: 500, atkAdd: 50, defAdd: 30, ascensionStat: { key: "CRIT_RATE", value: 19.2 } },
      ],
      roles: ["MainDPS"],
      skills: [
        { id: "na", type: "NormalAttack", name: "Normal", description: "", scaling: [] },
        { id: "skill", type: "ElementalSkill", name: "Skill", description: "", scaling: [] },
        { id: "burst", type: "ElementalBurst", name: "Burst", description: "", scaling: [] },
      ],
    },
    {
      id: "test-pyro-2",
      name: "Test Pyro Two",
      element: "Pyro",
      weaponType: "Sword",
      rarity: 4,
      baseStats: { baseHP: 90, baseATK: 9, baseDEF: 7 },
      growthCurveId: "standard",
      ascensions: Array.from({ length: 6 }, () => ({
        hpAdd: 0,
        atkAdd: 0,
        defAdd: 0,
        ascensionStat: { key: "ATK_PCT" as const, value: 0 },
      })),
      roles: ["SubDPS"],
      skills: [],
    },
    {
      id: "test-hydro",
      name: "Test Hydro",
      element: "Hydro",
      weaponType: "Catalyst",
      rarity: 5,
      baseStats: { baseHP: 120, baseATK: 8, baseDEF: 9 },
      growthCurveId: "standard",
      ascensions: Array.from({ length: 6 }, () => ({
        hpAdd: 0,
        atkAdd: 0,
        defAdd: 0,
        ascensionStat: { key: "HEAL_BONUS" as const, value: 0 },
      })),
      roles: ["Healer"],
      skills: [],
    },
  ],
  weapons: [
    {
      id: "test-claymore",
      name: "Test Claymore",
      weaponType: "Claymore",
      rarity: 5,
      baseATK: 600,
      secondaryStat: { key: "CRIT_DMG", value: 88.2 },
      passiveStatBonuses: [{ key: "ATK_PCT", value: 20 }],
    },
  ],
  artifactSets: [
    {
      id: "gladiator",
      name: "Gladiator's Finale",
      bonus2: { description: "+18% ATK.", statBonuses: [{ key: "ATK_PCT", value: 18 }] },
      bonus4: { description: "Non-stat 4pc effect.", statBonuses: [] },
    },
    {
      id: "crimson",
      name: "Crimson Witch of Flames",
      bonus2: { description: "+15% Pyro DMG.", statBonuses: [{ key: "PYRO_DMG", value: 15 }] },
      bonus4: { description: "Non-stat 4pc effect.", statBonuses: [] },
    },
  ],
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
};
