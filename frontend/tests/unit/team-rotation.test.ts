import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "@app/dataset";
import { DEFAULT_ROTATION, DEFAULT_TALENT_LEVELS } from "@app/contracts";
import type { LoadoutInput } from "@app/contracts";
import { computeFinalStats } from "@app/stat-engine";
import { computeTeamDamage, type TeamDamageEntry } from "../../src/teamDamage";
import { talentHits } from "../../src/rotation";
import type { CharacterDetail, SavedLoadout } from "../../src/types";

/**
 * Batch 7 #9 — team damage used `rotationInstances`: the single strongest DMG row of each talent,
 * once. That isn't a rotation. It ignores NA strings, multi-hit skills and burst uptime, and
 * weights a 4-member team as 12 hits regardless of who is actually on field.
 */
const dataset = loadBundledDataset();

const detailFor = (id: string): CharacterDetail => {
  const character = dataset.characters.find((c) => c.id === id);
  if (!character) throw new Error(`missing character ${id}`);
  return { character, curves: dataset.curves };
};

/** A minimal saved loadout for `id`, optionally carrying a rotation. */
function loadoutFor(id: string, rotation = DEFAULT_ROTATION): SavedLoadout {
  const input: LoadoutInput = {
    name: id,
    characterId: id,
    level: 90,
    ascensionPhase: 6,
    weaponId: null,
    artifacts: [],
    constellation: 0,
    refinement: 1,
    notes: "",
    tags: [],
    activeConditionals: [],
    talentLevels: DEFAULT_TALENT_LEVELS,
    rotation,
  };
  const { stats, activeSetBonuses } = computeFinalStats(input, dataset);
  return { ...input, id: `${id}-lo`, computedFinalStats: stats, activeSetBonuses };
}

const OPTS = { reaction: "none", transformative: "none", enemyLevel: 90, enemyRes: 10 };
const entry = (id: string, lo?: SavedLoadout): TeamDamageEntry => ({ detail: detailFor(id), loadout: lo });

describe("team damage uses a member's saved rotation", () => {
  const hits = talentHits(detailFor("hu-tao").character, DEFAULT_TALENT_LEVELS);
  const firstNa = hits.find((h) => h.talentType === "NormalAttack")!;

  it("falls back to one illustrative hit per talent when no rotation is saved", () => {
    const r = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao"))], OPTS);
    expect(r.rotation.characterIds).toEqual([]);
    // Hu Tao has three combat talents, so the illustrative rotation is three instances.
    expect(r.damage!.perCharacter[0]!.instances).toHaveLength(3);
  });

  it("uses the saved lines, repeated by count", () => {
    const rotation = { lines: [{ instId: firstNa.id, count: 6 }], seconds: 20 };
    const r = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao", rotation))], OPTS);
    expect(r.damage!.perCharacter[0]!.instances).toHaveLength(6);
    expect(r.rotation.characterIds).toEqual(["hu-tao"]);
    expect(r.rotation.seconds).toBe(20);
  });

  it("counts an NA string as a string, not as one hit", () => {
    const one = { lines: [{ instId: firstNa.id, count: 1 }], seconds: 20 };
    const six = { lines: [{ instId: firstNa.id, count: 6 }], seconds: 20 };
    const a = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao", one))], OPTS);
    const b = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao", six))], OPTS);
    expect(b.damage!.totalEstimated / a.damage!.totalEstimated).toBeCloseTo(6, 6);
  });

  it("drops a line whose hit no longer resolves rather than counting it as zero", () => {
    const rotation = { lines: [{ instId: firstNa.id, count: 2 }, { instId: "gone-99", count: 5 }], seconds: 20 };
    const r = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao", rotation))], OPTS);
    expect(r.damage!.perCharacter[0]!.instances).toHaveLength(2);
  });

  it("falls back for members without a rotation while using it for those with one", () => {
    const rotation = { lines: [{ instId: firstNa.id, count: 4 }], seconds: 25 };
    const r = computeTeamDamage(
      [entry("hu-tao", loadoutFor("hu-tao", rotation)), entry("xingqiu", loadoutFor("xingqiu"))],
      OPTS,
    );
    expect(r.rotation.characterIds).toEqual(["hu-tao"]);
    expect(r.damage!.perCharacter.find((c) => c.characterId === "hu-tao")!.instances).toHaveLength(4);
    expect(r.damage!.perCharacter.find((c) => c.characterId === "xingqiu")!.instances.length).toBeGreaterThan(0);
  });

  it("reports the longest member rotation as the team's window", () => {
    const short = { lines: [{ instId: firstNa.id, count: 1 }], seconds: 12 };
    const long = { lines: [{ instId: firstNa.id, count: 1 }], seconds: 25 };
    const r = computeTeamDamage(
      [entry("hu-tao", loadoutFor("hu-tao", short)), entry("hu-tao", loadoutFor("hu-tao", long))],
      OPTS,
    );
    expect(r.rotation.seconds).toBe(25);
  });

  it("leaves a team of un-rotated builds reporting exactly what it did before", () => {
    const withEmpty = computeTeamDamage([entry("hu-tao", loadoutFor("hu-tao"))], OPTS);
    const withNone = computeTeamDamage([entry("hu-tao")], OPTS);
    // Same instance count; the geared build differs only by its (empty) gear, not its rotation.
    expect(withEmpty.damage!.perCharacter[0]!.instances).toHaveLength(
      withNone.damage!.perCharacter[0]!.instances.length,
    );
  });
});
