import { describe, it, expect } from "vitest";
import { estimateTeamDamage, emReactionBonus, instanceAvgDamage } from "../src/index";
import type { DamageMember } from "../src/index";

describe("instanceAvgDamage (A7)", () => {
  const base = { multiplier: 100, statValue: 1000, critRate: 50, critDmg: 100, dmgBonusPct: 50 };
  it("is positive and rises with multiplier, stat, crit, and DMG bonus", () => {
    const d = instanceAvgDamage(base);
    expect(d).toBeGreaterThan(0);
    expect(instanceAvgDamage({ ...base, multiplier: 200 })).toBeGreaterThan(d);
    expect(instanceAvgDamage({ ...base, statValue: 2000 })).toBeGreaterThan(d);
    expect(instanceAvgDamage({ ...base, critDmg: 200 })).toBeGreaterThan(d);
    expect(instanceAvgDamage({ ...base, dmgBonusPct: 100 })).toBeGreaterThan(d);
  });
});

const member: DamageMember = {
  characterId: "test-pyro",
  finalATK: 1732,
  critRate: 55,
  critDmg: 138,
  dmgBonusPct: 61.6,
  talentMultiplier: 400,
};

describe("estimateTeamDamage (T040 / FR-016, SC-009)", () => {
  it("returns a positive total and per-character breakdown", () => {
    const est = estimateTeamDamage([member, { ...member, characterId: "x2" }]);
    expect(est.totalEstimated).toBeGreaterThan(0);
    expect(est.perCharacter).toHaveLength(2);
    expect(est.perCharacter[0]?.characterId).toBe("test-pyro");
  });

  it("echoes the assumptions used, defaulting per the v1 generic rotation (FR-016)", () => {
    const est = estimateTeamDamage([member]);
    expect(est.assumptions.enemyLevel).toBe(90);
    expect(est.assumptions.enemyResistancePct).toBe(10);
    expect(est.assumptions.rotation).toBe("v1-generic");
  });

  it("honors overridden assumptions", () => {
    const est = estimateTeamDamage([member], { enemyResistancePct: 0, enemyLevel: 100 });
    expect(est.assumptions.enemyResistancePct).toBe(0);
    expect(est.assumptions.enemyLevel).toBe(100);
  });

  it("is monotonic: more ATK yields more estimated damage", () => {
    const low = estimateTeamDamage([{ ...member, finalATK: 1000 }]).totalEstimated;
    const high = estimateTeamDamage([{ ...member, finalATK: 2000 }]).totalEstimated;
    expect(high).toBeGreaterThan(low);
  });

  it("scales amplifying reactions with EM (A3)", () => {
    // emReactionBonus golden values: 1 at EM 0; ~1.3475 at 200; ~2.1583 at 1000.
    expect(emReactionBonus(0)).toBeCloseTo(1, 5);
    expect(emReactionBonus(200)).toBeCloseTo(1.3475, 3);
    expect(emReactionBonus(1000)).toBeCloseTo(2.1583, 3);
    const noEm = estimateTeamDamage([{ ...member, reactionMultiplier: 1.5, reactionType: "Vaporize", em: 0 }]);
    const withEm = estimateTeamDamage([{ ...member, reactionMultiplier: 1.5, reactionType: "Vaporize", em: 200 }]);
    expect(withEm.totalEstimated).toBeGreaterThan(noEm.totalEstimated);
  });

  it("breaks damage into per-instance rows that sum to the total (A4)", () => {
    const est = estimateTeamDamage([
      { ...member, instances: [{ label: "Skill", multiplier: 300 }, { label: "Burst", multiplier: 500 }] },
    ]);
    const p = est.perCharacter[0];
    expect(p?.instances.map((i) => i.label)).toEqual(["Skill", "Burst"]);
    const sum = (p?.instances ?? []).reduce((s, i) => s + i.estimated, 0);
    expect(sum).toBeCloseTo(p?.estimated ?? 0, 3);
  });

  it("collects distinct reaction types into the assumptions", () => {
    const est = estimateTeamDamage([
      { ...member, reactionType: "Vaporize", reactionMultiplier: 1.5 },
      { ...member, characterId: "x2", reactionType: "Melt", reactionMultiplier: 2 },
    ]);
    expect(est.assumptions.reactionTypes.sort()).toEqual(["Melt", "Vaporize"]);
  });

  it("completes well within the 5s budget for a 4-character team (SC-009)", () => {
    const team = Array.from({ length: 4 }, (_, i) => ({ ...member, characterId: `c${i}` }));
    const start = performance.now();
    estimateTeamDamage(team);
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
