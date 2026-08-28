import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "@app/dataset";
import type { StatKey } from "@app/contracts";
import { optimize, type OwnedArtifact } from "../src/index";

const dataset = loadBundledDataset();

function art(
  id: string,
  slot: OwnedArtifact["slot"],
  mainKey: StatKey,
  mainVal: number,
  subs: [StatKey, number][],
  setId = "crimson-witch-of-flames",
): OwnedArtifact {
  return {
    id,
    slot,
    setId,
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

// Batch 7 #3 — the optimizer used to hardcode `activeConditionals: []`, so it scored every
// candidate WITHOUT the 4-piece effects players build around and systematically under-rated
// them. Marechaussee Hunter's 4pc conditional is +36% CRIT Rate, which is 72 CV.
describe("optimize counts the conditional buffs a build unlocks", () => {
  const CW = "crimson-witch-of-flames";
  const MH = "marechaussee-hunter";
  // Two full sets in the inventory. Neither piece set wins on raw substats — Marechaussee is
  // deliberately the WEAKER one bare, so it can only come out ahead via its 4pc conditional.
  const inv: OwnedArtifact[] = [
    art("cw-f", "Flower", "HP", 4780, [["CRIT_RATE", 12]], CW),
    art("cw-p", "Plume", "ATK", 311, [["CRIT_DMG", 20]], CW),
    art("cw-s", "Sands", "ATK_PCT", 46.6, [["CRIT_RATE", 12]], CW),
    art("cw-g", "Goblet", "PYRO_DMG", 46.6, [["CRIT_DMG", 20]], CW),
    art("cw-c", "Circlet", "CRIT_DMG", 62.2, [["CRIT_RATE", 12]], CW),
    art("mh-f", "Flower", "HP", 4780, [["CRIT_RATE", 6]], MH),
    art("mh-p", "Plume", "ATK", 311, [["CRIT_DMG", 12]], MH),
    art("mh-s", "Sands", "ATK_PCT", 46.6, [["CRIT_RATE", 6]], MH),
    art("mh-g", "Goblet", "PYRO_DMG", 46.6, [["CRIT_DMG", 12]], MH),
    art("mh-c", "Circlet", "CRIT_DMG", 62.2, [["CRIT_RATE", 6]], MH),
  ];
  // Bare, Marechaussee trails by ~52 CV; its 4pc conditional is +36% CRIT Rate = 72 CV, so it
  // can only win once conditionals are counted. That margin is the whole point of the test.
  const base = { characterId: "hu-tao", weaponId: "staff-of-homa", target: "CV" as const, topN: 10 };
  const countOf = (b: { artifacts: OwnedArtifact[] } | undefined, setId: string) =>
    (b?.artifacts ?? []).filter((a) => a.setId === setId).length;

  it("bare scoring picks the pieces with the better substats, ignoring set effects", () => {
    const res = optimize(inv, dataset, { ...base, includeConditionals: false });
    expect(countOf(res[0], CW)).toBe(5); // every CW piece out-rolls its MH counterpart
    expect(res[0]?.activeConditionals).toEqual([]); // opted out entirely
  });

  it("with conditionals counted, the weaker-substat set wins on its 4pc buff", () => {
    const res = optimize(inv, dataset, base);
    // Note it does NOT go 5pc: 4 Marechaussee pieces unlock the buff, and the 5th slot is then
    // free to take the better-rolled Crimson Witch piece. Getting that right is the point of
    // scoring conditionals inside the search rather than bolting them on afterwards.
    expect(countOf(res[0], MH)).toBeGreaterThanOrEqual(4);
    expect(res[0]?.activeConditionals).toContain("mh4-crit");
    // …and it genuinely beats the best bare build, rather than merely reporting the buff.
    const bare = optimize(inv, dataset, { ...base, includeConditionals: false });
    expect(res[0]!.score).toBeGreaterThan(bare[0]!.score);
  });

  it("reports the buffs it folded into each build's stats", () => {
    const res = optimize(inv, dataset, { ...base, setId: CW });
    expect(res[0]?.activeConditionals).toContain("cw4-pyro");
    // …and they are actually in the numbers, not just reported.
    const bare = optimize(inv, dataset, { ...base, setId: CW, includeConditionals: false });
    expect(res[0]!.finalStats.PYRO_DMG!).toBeGreaterThan(bare[0]!.finalStats.PYRO_DMG!);
  });

  it("does not unlock a 4pc buff for a 2+2 split", () => {
    const split: OwnedArtifact[] = [
      art("cw-f", "Flower", "HP", 4780, [["CRIT_RATE", 12]], CW),
      art("cw-p", "Plume", "ATK", 311, [["CRIT_DMG", 20]], CW),
      art("mh-s", "Sands", "ATK_PCT", 46.6, [["CRIT_RATE", 12]], MH),
      art("mh-g", "Goblet", "PYRO_DMG", 46.6, [["CRIT_DMG", 20]], MH),
      art("cw-c", "Circlet", "CRIT_DMG", 62.2, [["CRIT_RATE", 12]], CW),
    ];
    const res = optimize(split, dataset, base);
    // 3+2 — neither set reaches 4 pieces, so no SET buff unlocks. The weapon-passive buff
    // (Staff of Homa) is gated on the weapon, not the artifacts, so it still applies.
    expect(res[0]?.activeConditionals).not.toContain("cw4-pyro");
    expect(res[0]?.activeConditionals).not.toContain("mh4-crit");
    expect(res[0]?.activeConditionals).toContain("homa-hp");
  });
});
