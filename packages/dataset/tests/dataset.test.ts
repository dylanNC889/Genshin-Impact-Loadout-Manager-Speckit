import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "../src/index";
import { computeBaseStats, computeFinalStats, statRecord } from "@app/stat-engine";
import { ELEMENTS, WEAPON_TYPES } from "@app/contracts";
import type { LoadoutInput } from "@app/contracts";

const dataset = loadBundledDataset();
const byId = (id: string) => {
  const c = dataset.characters.find((x) => x.id === id);
  if (!c) throw new Error(`missing dataset character ${id}`);
  return c;
};

describe("full genshin-db dataset loads and validates against @app/contracts (T014)", () => {
  it("parses without throwing and covers the full roster", () => {
    expect(dataset.characters.length).toBeGreaterThanOrEqual(100);
    expect(dataset.weapons.length).toBeGreaterThanOrEqual(150);
    expect(dataset.artifactSets.length).toBeGreaterThanOrEqual(40);
    expect(dataset.meta.gameVersion).toBe("genshin-db-5");
  });

  it("covers every element and weapon type, with no duplicate ids (T056)", () => {
    const byElement = new Map<string, number>();
    const byWeapon = new Map<string, number>();
    for (const c of dataset.characters) {
      byElement.set(c.element, (byElement.get(c.element) ?? 0) + 1);
      byWeapon.set(c.weaponType, (byWeapon.get(c.weaponType) ?? 0) + 1);
    }
    for (const e of ELEMENTS) expect(byElement.get(e) ?? 0).toBeGreaterThanOrEqual(2);
    for (const w of WEAPON_TYPES) expect(byWeapon.get(w) ?? 0).toBeGreaterThanOrEqual(2);
    expect(new Set(dataset.characters.map((c) => c.id)).size).toBe(dataset.characters.length);
  });

  it("characters have real skill descriptions (FR-004)", () => {
    const huTao = byId("hu-tao");
    expect(huTao.skills.length).toBeGreaterThanOrEqual(3);
    expect(huTao.skills.every((s) => s.description.length > 0)).toBe(true);
  });
});

describe("engine reproduces real Lv90 base stats from the imported data (SC-003)", () => {
  it("Hu Tao Lv90/A6 base stats match the game", () => {
    const b = computeBaseStats(byId("hu-tao"), 90, 6, dataset.curves);
    expect(b.baseHP).toBeCloseTo(15552, 0);
    expect(b.baseATK).toBeCloseTo(106, 0);
    expect(b.baseDEF).toBeCloseTo(876, 0);
    expect(b.sheet.CRIT_DMG).toBeCloseTo(138.4, 1); // 50 base + 88.4 ascension
  });

  it("applies real ascension stats across stat types", () => {
    expect(computeBaseStats(byId("zhongli"), 90, 6, dataset.curves).sheet.GEO_DMG).toBeCloseTo(28.8, 1);
    expect(computeBaseStats(byId("bennett"), 90, 6, dataset.curves).sheet.ER).toBeCloseTo(126.67, 1);
    expect(computeBaseStats(byId("kaedehara-kazuha"), 90, 6, dataset.curves).sheet.EM).toBeCloseTo(115.2, 1);
  });

  it("only the supported level (90) is populated in this dataset", () => {
    expect(() => computeBaseStats(byId("hu-tao"), 80, 6, dataset.curves)).toThrow(/no entry for level 80/);
  });
});

describe("end-to-end loadout with real data (US2 integration)", () => {
  it("Hu Tao + Staff of Homa stacks weapon CRIT DMG and base ATK", () => {
    const loadout: LoadoutInput = {
      name: "Hu Tao Homa",
      characterId: "hu-tao",
      level: 90,
      ascensionPhase: 6,
      weaponId: "staff-of-homa",
      artifacts: [
        { slot: "Goblet", setId: "crimson-witch-of-flames", mainStat: { key: "PYRO_DMG", value: 46.6 }, subStats: [] },
        { slot: "Circlet", setId: "crimson-witch-of-flames", mainStat: { key: "CRIT_RATE", value: 31.1 }, subStats: [] },
      ],
    };
    const r = statRecord(computeFinalStats(loadout, dataset).stats);
    expect(r.CRIT_DMG).toBeGreaterThan(200); // 50 + ascension 88.4 + weapon ~66
    expect(r.ATK).toBeGreaterThan(700); // character 106 + weapon base ~608
    expect(r.PYRO_DMG).toBeCloseTo(46.6 + 15, 1); // goblet main + Crimson Witch 2pc
  });
});
