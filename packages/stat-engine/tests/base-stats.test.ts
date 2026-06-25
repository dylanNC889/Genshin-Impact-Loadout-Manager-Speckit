import { describe, it, expect } from "vitest";
import { computeBaseStats, computeBaseSheet, statRecord } from "../src/index";
import { testDataset } from "./fixtures";

const pyro = testDataset.characters[0]!;
const curves = testDataset.curves;

describe("computeBaseStats (T019 / FR-002, FR-003, SC-003)", () => {
  it("returns level-1 base with no ascension and universal base stats", () => {
    const b = computeBaseStats(pyro, 1, 0, curves);
    expect(b.baseHP).toBeCloseTo(100, 6);
    expect(b.baseATK).toBeCloseTo(10, 6);
    expect(b.baseDEF).toBeCloseTo(8, 6);
    expect(b.sheet.CRIT_RATE).toBe(5);
    expect(b.sheet.CRIT_DMG).toBe(50);
    expect(b.sheet.ER).toBe(100);
  });

  it("applies the level-90 curve factor and cumulative phase-6 ascension adds", () => {
    const b = computeBaseStats(pyro, 90, 6, curves);
    // 100*12 + 500, 10*12 + 50, 8*12 + 30
    expect(b.baseHP).toBeCloseTo(1700, 6);
    expect(b.baseATK).toBeCloseTo(170, 6);
    expect(b.baseDEF).toBeCloseTo(126, 6);
  });

  it("folds the dedicated ascension stat onto the universal base (5% + 19.2%)", () => {
    const b = computeBaseStats(pyro, 90, 6, curves);
    expect(b.sheet.CRIT_RATE).toBeCloseTo(24.2, 6);
  });

  it("shows the ascension stat jump at the breakpoint (phase 5 -> 6)", () => {
    const p5 = computeBaseStats(pyro, 90, 5, curves);
    const p6 = computeBaseStats(pyro, 90, 6, curves);
    expect(p5.sheet.CRIT_RATE).toBeCloseTo(19.4, 6); // 5 + 14.4
    expect(p6.sheet.CRIT_RATE).toBeCloseTo(24.2, 6); // 5 + 19.2
    expect(p6.baseHP).toBeGreaterThan(p5.baseHP);
  });

  it("computeBaseSheet exposes HP/ATK/DEF as displayable StatValues (FR-002)", () => {
    const r = statRecord(computeBaseSheet(pyro, 90, 6, curves));
    expect(r.HP).toBeCloseTo(1700, 6);
    expect(r.ATK).toBeCloseTo(170, 6);
    expect(r.CRIT_RATE).toBeCloseTo(24.2, 6);
  });

  it("throws on an unknown level not present in the curve", () => {
    expect(() => computeBaseStats(pyro, 55, 6, curves)).toThrow(/no entry for level 55/);
  });
});
