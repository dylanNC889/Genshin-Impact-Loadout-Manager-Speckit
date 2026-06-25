import { describe, it, expect } from "vitest";
import { estimateTeamDamage } from "../src/index";
import type { DamageMember } from "../src/index";

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
