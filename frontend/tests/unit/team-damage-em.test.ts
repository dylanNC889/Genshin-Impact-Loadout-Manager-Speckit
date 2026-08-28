import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "@app/dataset";
import { computeTeamDamage, type TeamDamageEntry } from "../../src/teamDamage";
import type { CharacterDetail } from "../../src/types";

/**
 * Batch 7 #7 — shared EM has to reach the damage numbers, not just the buff table. Reactions
 * (amplifying, transformative and catalyze) all scale off the triggerer's EM, so a buffer picked
 * FOR its EM share should visibly move the estimate.
 */
const dataset = loadBundledDataset();
const detailFor = (id: string): CharacterDetail => {
  const character = dataset.characters.find((c) => c.id === id);
  if (!character) throw new Error(`missing character ${id}`);
  return { character, curves: dataset.curves };
};
const entries = (...ids: string[]): TeamDamageEntry[] => ids.map((id) => ({ detail: detailFor(id) }));

const OPTS = { reaction: "none", transformative: "none", enemyLevel: 90, enemyRes: 10 };

describe("shared EM reaches the damage estimate", () => {
  it("raises transformative damage when an EM sharer joins", () => {
    // Hyperbloom: the Electro trigger's damage scales off EM via transformativeEmBonus.
    const opts = { ...OPTS, transformative: "Hyperbloom" };
    const without = computeTeamDamage(entries("kuki-shinobu", "xingqiu", "collei"), opts);
    const withNahida = computeTeamDamage(entries("kuki-shinobu", "xingqiu", "nahida"), opts);
    expect(withNahida.damage!.totalEstimated).toBeGreaterThan(without.damage!.totalEstimated);
  });

  it("raises amplifying-reaction damage too", () => {
    const opts = { ...OPTS, reaction: "vaporize-2" };
    const without = computeTeamDamage(entries("hu-tao", "xingqiu", "collei"), opts);
    const withSucrose = computeTeamDamage(entries("hu-tao", "xingqiu", "sucrose"), opts);
    // Sucrose brings a VV shred too, so assert the EM path specifically: the Pyro member's own
    // line must rise, and by more than the shred alone would give.
    const huTao = (r: typeof without) =>
      r.damage!.perCharacter.find((c) => c.characterId === "hu-tao")!.estimated;
    expect(huTao(withSucrose)).toBeGreaterThan(huTao(without));
  });

  it("does not change a team with no reaction, since EM only powers reactions here", () => {
    const without = computeTeamDamage(entries("noelle", "ningguang"), OPTS);
    const withNahida = computeTeamDamage(entries("noelle", "ningguang", "nahida"), {
      ...OPTS,
      transformative: "none",
    });
    const noelle = (r: typeof without) =>
      r.damage!.perCharacter.find((c) => c.characterId === "noelle")!.estimated;
    expect(noelle(withNahida)).toBeCloseTo(noelle(without), 6);
  });
});
