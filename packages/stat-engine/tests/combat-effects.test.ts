import { describe, it, expect } from "vitest";
import {
  computeFinalStats,
  conditionalCombatEffects,
  estimateTeamDamage,
  instanceAvgDamage,
  resMultiplier,
  statRecord,
  totalResShred,
} from "../src/index";
import type { ConditionalBuff, LoadoutInput } from "@app/contracts";
import { testDataset } from "./fixtures";

const BUFFS: ConditionalBuff[] = [
  {
    id: "shimenawa4",
    label: "Shimenawa 4pc",
    effects: [],
    talentDmgBonuses: [{ scopes: ["NormalAttack", "ChargedAttack"], value: 50 }],
    defaultOn: true,
  },
  {
    id: "goldentroupe4",
    label: "Golden Troupe 4pc",
    effects: [],
    talentDmgBonuses: [{ scopes: ["ElementalSkill"], value: 25 }],
    defaultOn: true,
  },
  {
    id: "vv4",
    label: "VV 4pc",
    effects: [],
    resShred: { pct: 40, elements: ["Pyro", "Hydro", "Electro", "Cryo"], source: "viridescent-venerer" },
    defaultOn: true,
  },
  {
    id: "cw4",
    label: "Crimson Witch 4pc",
    effects: [{ key: "PYRO_DMG", value: 22.5 }],
    defaultOn: true,
  },
];

describe("conditionalCombatEffects", () => {
  it("collects per-hit DMG% per talent scope from the enabled buffs only", () => {
    const e = conditionalCombatEffects(["shimenawa4"], BUFFS);
    expect(e.talentDmgPct.NormalAttack).toBe(50);
    expect(e.talentDmgPct.ChargedAttack).toBe(50);
    expect(e.talentDmgPct.ElementalSkill).toBe(0);
    expect(e.talentDmgPct.ElementalBurst).toBe(0);
  });

  it("sums scopes across several enabled buffs", () => {
    const e = conditionalCombatEffects(["shimenawa4", "goldentroupe4"], BUFFS);
    expect(e.talentDmgPct.NormalAttack).toBe(50);
    expect(e.talentDmgPct.ElementalSkill).toBe(25);
  });

  it("returns nothing for disabled buffs, unknown ids, or a missing catalogue", () => {
    expect(conditionalCombatEffects([], BUFFS).talentDmgPct.NormalAttack).toBe(0);
    expect(conditionalCombatEffects(["nope"], BUFFS).resShred).toEqual([]);
    expect(conditionalCombatEffects(["shimenawa4"], undefined).talentDmgPct.NormalAttack).toBe(0);
  });

  it("collects RES shred separately from sheet stats", () => {
    const e = conditionalCombatEffects(["vv4", "cw4"], BUFFS);
    expect(e.resShred).toHaveLength(1);
    expect(e.resShred[0]?.pct).toBe(40);
  });

  it("leaves per-hit DMG% and RES shred out of the stat sheet entirely", () => {
    const loadout: LoadoutInput = {
      name: "T",
      characterId: "test-pyro",
      level: 90,
      ascensionPhase: 6,
      weaponId: null,
      artifacts: [],
      activeConditionals: ["shimenawa4", "vv4"],
    } as LoadoutInput;
    const ds = { ...testDataset, conditionalBuffs: BUFFS };
    const off = statRecord(computeFinalStats({ ...loadout, activeConditionals: [] }, ds).stats);
    const on = statRecord(computeFinalStats(loadout, ds).stats);
    // No sheet stat may move — that is exactly why these effects need their own path.
    expect(on).toEqual(off);
  });
});

describe("totalResShred", () => {
  const vvTeam = { pct: 40, elements: ["Pyro" as const], source: "viridescent-venerer" };
  const vvGear = { pct: 40, elements: ["Pyro" as const], source: "viridescent-venerer" };

  it("applies an element-scoped shred only to that element", () => {
    expect(totalResShred([vvTeam], "Pyro")).toBe(40);
    expect(totalResShred([vvTeam], "Geo")).toBe(0);
  });

  it("skips element-scoped shreds when the damage element is unknown", () => {
    expect(totalResShred([vvTeam], undefined)).toBe(0);
  });

  it("applies an unscoped shred to every element, and when the element is unknown", () => {
    const zhongli = { pct: 20, source: "zhongli" };
    expect(totalResShred([zhongli], "Geo")).toBe(20);
    expect(totalResShred([zhongli], undefined)).toBe(20);
  });

  it("takes the max of same-source shreds instead of stacking them", () => {
    // A Kazuha teammate AND this build's own VV 4pc are one in-game debuff, not two.
    expect(totalResShred([vvTeam, vvGear], "Pyro")).toBe(40);
  });

  it("stacks shreds from different sources", () => {
    expect(totalResShred([vvTeam, { pct: 20, source: "zhongli" }], "Pyro")).toBe(60);
  });

  it("caps the total at 60 points", () => {
    const big = [
      { pct: 40, source: "a" },
      { pct: 30, source: "b" },
      { pct: 30, source: "c" },
    ];
    expect(totalResShred(big, "Pyro")).toBe(60);
  });
});

describe("per-hit DMG% in the damage calc", () => {
  const member = {
    characterId: "test-pyro",
    finalATK: 2000,
    critRate: 0,
    critDmg: 0,
    dmgBonusPct: 0,
    talentMultiplier: 100,
  };

  it("applies a scoped bonus only to instances of that talent", () => {
    const instances = [
      { label: "Normal Attack", multiplier: 100, scope: "NormalAttack" as const },
      { label: "Elemental Burst", multiplier: 100, scope: "ElementalBurst" as const },
    ];
    const plain = estimateTeamDamage([{ ...member, instances }]);
    const buffed = estimateTeamDamage([
      { ...member, instances, talentDmgPct: { NormalAttack: 50 } },
    ]);
    const na = (r: typeof plain) => r.perCharacter[0]!.instances[0]!.estimated;
    const burst = (r: typeof plain) => r.perCharacter[0]!.instances[1]!.estimated;

    expect(na(buffed) / na(plain)).toBeCloseTo(1.5, 6); // +50% on the buffed talent
    expect(burst(buffed)).toBeCloseTo(burst(plain), 6); // untouched on the other
  });

  it("ignores talentDmgPct for instances that carry no scope", () => {
    const instances = [{ label: "Rotation", multiplier: 100 }];
    const plain = estimateTeamDamage([{ ...member, instances }]);
    const buffed = estimateTeamDamage([{ ...member, instances, talentDmgPct: { NormalAttack: 50 } }]);
    expect(buffed.totalEstimated).toBeCloseTo(plain.totalEstimated, 6);
  });

  it("adds to any existing DMG% rather than replacing it", () => {
    const instances = [{ label: "NA", multiplier: 100, scope: "NormalAttack" as const }];
    const base = estimateTeamDamage([{ ...member, dmgBonusPct: 50, instances }]);
    const both = estimateTeamDamage([
      { ...member, dmgBonusPct: 50, instances, talentDmgPct: { NormalAttack: 50 } },
    ]);
    // 1.5 -> 2.0 multiplier, i.e. the two bonuses add before multiplying.
    expect(both.totalEstimated / base.totalEstimated).toBeCloseTo(2 / 1.5, 6);
  });

  it("instanceAvgDamage folds talentDmgBonusPct into the DMG% multiplier", () => {
    const args = { multiplier: 100, statValue: 2000, critRate: 0, critDmg: 0, dmgBonusPct: 0 };
    const plain = instanceAvgDamage(args);
    const buffed = instanceAvgDamage({ ...args, talentDmgBonusPct: 25 });
    expect(buffed / plain).toBeCloseTo(1.25, 6);
  });
});

describe("resMultiplier (the game's piecewise RES curve)", () => {
  it("is linear between 0% and 75% RES", () => {
    expect(resMultiplier(0)).toBeCloseTo(1, 6);
    expect(resMultiplier(10)).toBeCloseTo(0.9, 6);
    expect(resMultiplier(50)).toBeCloseTo(0.5, 6);
  });

  it("HALVES shred past 0 — the branch RES-shred buffs reach", () => {
    // −30% effective RES is worth x1.15, not the x1.30 a linear form would claim.
    expect(resMultiplier(-30)).toBeCloseTo(1.15, 6);
    expect(resMultiplier(-100)).toBeCloseTo(1.5, 6);
  });

  it("diminishes at or above 75% RES instead of reaching zero", () => {
    expect(resMultiplier(75)).toBeCloseTo(0.25, 6);
    expect(resMultiplier(100)).toBeCloseTo(0.2, 6);
    expect(resMultiplier(200)).toBeGreaterThan(0);
  });

  it("is continuous at both boundaries", () => {
    expect(resMultiplier(-0.0001)).toBeCloseTo(1, 4);
    expect(resMultiplier(74.9999)).toBeCloseTo(0.25, 4);
  });
});
