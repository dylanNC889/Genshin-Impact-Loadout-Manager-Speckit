import { describe, it, expect } from "vitest";
import { computeFinalStats, statRecord } from "../src/index";
import type { LoadoutInput } from "@app/contracts";
import { testDataset } from "./fixtures";

const fullLoadout: LoadoutInput = {
  name: "Full",
  characterId: "test-pyro",
  level: 90,
  ascensionPhase: 6,
  weaponId: "test-claymore",
  artifacts: [
    { slot: "Flower", setId: "gladiator", mainStat: { key: "HP", value: 4780 }, subStats: [] },
    { slot: "Plume", setId: "gladiator", mainStat: { key: "ATK", value: 311 }, subStats: [] },
    { slot: "Sands", setId: "crimson", mainStat: { key: "ATK_PCT", value: 46.6 }, subStats: [] },
    { slot: "Goblet", setId: "crimson", mainStat: { key: "PYRO_DMG", value: 46.6 }, subStats: [] },
    { slot: "Circlet", setId: "crimson", mainStat: { key: "CRIT_RATE", value: 31.1 }, subStats: [] },
  ],
};

describe("computeFinalStats (T028 / FR-008, FR-009, SC-003)", () => {
  it("applies ATK% to (character base ATK + weapon base ATK), then adds flat ATK", () => {
    const r = statRecord(computeFinalStats(fullLoadout, testDataset).stats);
    // ATK% = weapon 20 + sands 46.6 + gladiator 2pc 18 = 84.6
    // (170 + 600) * 1.846 + 311(plume) = 1421.42 + 311 = 1732.42
    expect(r.ATK).toBeCloseTo(1732.42, 2);
  });

  it("aggregates crit, elemental DMG, and set bonuses correctly", () => {
    const r = statRecord(computeFinalStats(fullLoadout, testDataset).stats);
    expect(r.CRIT_RATE).toBeCloseTo(55.3, 6); // base 24.2 + circlet 31.1
    expect(r.CRIT_DMG).toBeCloseTo(138.2, 6); // base 50 + weapon 88.2
    expect(r.PYRO_DMG).toBeCloseTo(61.6, 6); // goblet 46.6 + crimson 2pc 15
    expect(r.HP).toBeCloseTo(6480, 6); // base 1700 + flower 4780
  });

  it("detects active 2-piece set bonuses (FR-009)", () => {
    const { activeSetBonuses } = computeFinalStats(fullLoadout, testDataset);
    expect(activeSetBonuses).toContainEqual({ setId: "gladiator", pieces: 2 });
    expect(activeSetBonuses).toContainEqual({ setId: "crimson", pieces: 2 });
    expect(activeSetBonuses.some((b) => b.pieces === 4)).toBe(false);
  });

  it("applies a 4-piece bonus when 4 of a set are equipped", () => {
    const fourSet: LoadoutInput = {
      ...fullLoadout,
      artifacts: fullLoadout.artifacts.map((a) => ({ ...a, setId: "crimson" })),
    };
    const { activeSetBonuses } = computeFinalStats(fourSet, testDataset);
    expect(activeSetBonuses).toContainEqual({ setId: "crimson", pieces: 2 });
    expect(activeSetBonuses).toContainEqual({ setId: "crimson", pieces: 4 });
  });

  it("computes a partial/empty loadout without error (FR-011)", () => {
    const partial: LoadoutInput = {
      name: "Bare",
      characterId: "test-pyro",
      level: 90,
      ascensionPhase: 6,
      weaponId: null,
      artifacts: [],
    };
    const r = statRecord(computeFinalStats(partial, testDataset).stats);
    expect(r.ATK).toBeCloseTo(170, 6); // base only, no weapon/gear
    expect(r.HP).toBeCloseTo(1700, 6);
  });

  it("rejects a weapon whose type does not match the character (FR-005)", () => {
    const bad: LoadoutInput = { ...fullLoadout, characterId: "test-hydro", weaponId: "test-claymore" };
    expect(() => computeFinalStats(bad, testDataset)).toThrow(/cannot be equipped/);
  });

  it("recalculation stays within the interactive performance budget (T030 / SC-002)", () => {
    const start = performance.now();
    for (let i = 0; i < 2000; i++) computeFinalStats(fullLoadout, testDataset);
    const perCall = (performance.now() - start) / 2000;
    expect(perCall).toBeLessThan(200); // <200ms p95 budget, with wide headroom
  });
});
