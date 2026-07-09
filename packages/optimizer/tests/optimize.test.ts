import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "@app/dataset";
import type { StatKey } from "@app/contracts";
import { optimize, type OwnedArtifact } from "../src/index";

const dataset = loadBundledDataset();

function art(id: string, slot: OwnedArtifact["slot"], mainKey: StatKey, mainVal: number, subs: [StatKey, number][]): OwnedArtifact {
  return {
    id,
    slot,
    setId: "crimson-witch-of-flames",
    mainStat: { key: mainKey, value: mainVal },
    subStats: subs.map(([key, value]) => ({ key, value, rollValues: [value] })),
  };
}

describe("optimize (B1)", () => {
  const inv: OwnedArtifact[] = [
    art("f", "Flower", "HP", 4780, [["CRIT_RATE", 10]]),
    art("p", "Plume", "ATK", 311, [["CRIT_DMG", 14]]),
    art("s", "Sands", "ATK_PCT", 46.6, [["CRIT_RATE", 8]]),
    art("g", "Goblet", "PYRO_DMG", 46.6, [["CRIT_DMG", 14]]),
    art("cLow", "Circlet", "CRIT_DMG", 62.2, [["CRIT_RATE", 3]]),
    art("cHigh", "Circlet", "CRIT_DMG", 62.2, [["CRIT_RATE", 20]]),
  ];
  const q = { characterId: "hu-tao", weaponId: "staff-of-homa", setId: "crimson-witch-of-flames", target: "CV" as const };

  it("picks the highest-CV build and sorts results descending", () => {
    const res = optimize(inv, dataset, q);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]?.artifacts.find((a) => a.slot === "Circlet")?.id).toBe("cHigh");
    expect(res[0]?.score).toBeGreaterThanOrEqual(res[res.length - 1]?.score ?? 0);
  });

  it("returns no builds when a slot has no matching piece", () => {
    const missingGoblet = inv.filter((a) => a.slot !== "Goblet");
    expect(optimize(missingGoblet, dataset, q)).toEqual([]);
  });
});
