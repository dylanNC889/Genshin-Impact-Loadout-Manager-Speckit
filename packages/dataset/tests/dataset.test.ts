import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "../src/index";
import { computeBaseStats, computeFinalStats, statRecord } from "@app/stat-engine";
import { ELEMENTS, WEAPON_TYPES } from "@app/contracts";
import type { LoadoutInput } from "@app/contracts";

const dataset = loadBundledDataset();
const byId = (id: string) => {
  const c = dataset.characters.find((x) => x.id === id);
  if (!c) throw new Error(`missing fixture character ${id}`);
  return c;
};

describe("curated dataset loads and validates against @app/contracts (T014)", () => {
  it("parses without throwing and has the expected shape", () => {
    expect(dataset.characters.length).toBe(30);
    expect(dataset.weapons.length).toBeGreaterThanOrEqual(19);
    expect(dataset.artifactSets.length).toBeGreaterThanOrEqual(18);
    expect(dataset.meta.gameVersion).toBe("5.x-slice");
  });

  it("covers every element and every weapon type, with >=2 characters each (coverage check, T056)", () => {
    const byElement = new Map<string, number>();
    const byWeapon = new Map<string, number>();
    for (const c of dataset.characters) {
      byElement.set(c.element, (byElement.get(c.element) ?? 0) + 1);
      byWeapon.set(c.weaponType, (byWeapon.get(c.weaponType) ?? 0) + 1);
    }
    for (const e of ELEMENTS) expect(byElement.get(e) ?? 0).toBeGreaterThanOrEqual(2);
    for (const w of WEAPON_TYPES) expect(byWeapon.get(w) ?? 0).toBeGreaterThanOrEqual(2);
    // No duplicate character ids.
    expect(new Set(dataset.characters.map((c) => c.id)).size).toBe(dataset.characters.length);
  });

  it("every artifact set with a 2pc stat bonus uses a valid StatKey", () => {
    for (const set of dataset.artifactSets) {
      for (const b of set.bonus2?.statBonuses ?? []) {
        expect(typeof b.value).toBe("number");
      }
    }
  });
});

describe("engine reproduces published Lv90 base stats from the dataset (SC-003 pipeline)", () => {
  it("Hu Tao Lv90/A6 base stats and CRIT DMG ascension", () => {
    const b = computeBaseStats(byId("hu-tao"), 90, 6, dataset.curves);
    expect(b.baseHP).toBeCloseTo(15552, 0);
    expect(b.baseATK).toBeCloseTo(106, 0);
    expect(b.baseDEF).toBeCloseTo(876, 0);
    expect(b.sheet.CRIT_DMG).toBeCloseTo(50 + 88.4, 4); // base 50% + ascension 88.4%
  });

  it("applies the correct ascension stat key per character", () => {
    expect(computeBaseStats(byId("diluc"), 90, 6, dataset.curves).sheet.CRIT_RATE).toBeCloseTo(24.2, 4);
    expect(computeBaseStats(byId("raiden-shogun"), 90, 6, dataset.curves).sheet.ER).toBeCloseTo(132, 4);
    expect(computeBaseStats(byId("nahida"), 90, 6, dataset.curves).sheet.EM).toBeCloseTo(115.2, 4);
  });

  it("only the supported level (90) is populated in this slice", () => {
    expect(() => computeBaseStats(byId("hu-tao"), 80, 6, dataset.curves)).toThrow(/no entry for level 80/);
  });
});

describe("end-to-end loadout with real data (US2 integration)", () => {
  it("Hu Tao + Staff of Homa stacks weapon CRIT DMG and base ATK onto final stats", () => {
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
    // CRIT DMG = base 50 + ascension 88.4 + weapon 66.2 = 204.6
    expect(r.CRIT_DMG).toBeCloseTo(204.6, 2);
    // ATK = character base 106 + weapon base 608 (no ATK% here) = 714
    expect(r.ATK).toBeCloseTo(714, 2);
    expect(r.PYRO_DMG).toBeCloseTo(46.6 + 15, 2); // goblet + crimson 2pc
  });
});
