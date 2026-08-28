import { describe, it, expect } from "vitest";
import { loadBundledDataset } from "../src/index";

/**
 * Referential integrity for `data/modifiers/*.json` (batch 7 #2).
 *
 * These files reference dataset ids by hand — `weaponId`, `setId`, and character ids as the keys
 * of constellations.json. Nothing validated them, so a renamed or removed id made the modifier
 * SILENTLY unreachable: no error, no warning, the buff simply never appeared in the editor and
 * its stats and damage were never applied. Zod validates each entry's *shape*, never whether the
 * thing it points at exists.
 *
 * The loader also swallows read/parse failures (`catch { return [] }`), so a malformed modifier
 * file degrades to "no modifiers at all" rather than failing — hence the non-empty assertions.
 */
const dataset = loadBundledDataset();

const characterIds = new Set(dataset.characters.map((c) => c.id));
const weaponIds = new Set(dataset.weapons.map((w) => w.id));
const setIds = new Set(dataset.artifactSets.map((s) => s.id));
const buffs = dataset.conditionalBuffs ?? [];

describe("modifier files are loaded at all", () => {
  // Guards the loader's silent catch: a malformed file would make every one of these empty.
  it("loads conditional buffs, constellation bonuses and weapon refinements", () => {
    expect(buffs.length).toBeGreaterThan(0);
    expect(Object.keys(dataset.constellationBonuses ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(dataset.weaponRefinements ?? {}).length).toBeGreaterThan(0);
  });
});

describe("conditional-buffs.json references resolve", () => {
  it("every weaponId names a weapon in the dataset", () => {
    const dangling = buffs
      .filter((b) => b.weaponId && !weaponIds.has(b.weaponId))
      .map((b) => `${b.id} -> weapon "${b.weaponId}"`);
    expect(dangling, `dangling weapon ids (buff -> missing id):\n${dangling.join("\n")}`).toEqual([]);
  });

  it("every setId names an artifact set in the dataset", () => {
    const dangling = buffs
      .filter((b) => b.setId && !setIds.has(b.setId))
      .map((b) => `${b.id} -> set "${b.setId}"`);
    expect(dangling, `dangling set ids (buff -> missing id):\n${dangling.join("\n")}`).toEqual([]);
  });

  it("has no duplicate buff ids", () => {
    const seen = new Set<string>();
    const dupes = buffs.filter((b) => (seen.has(b.id) ? true : (seen.add(b.id), false))).map((b) => b.id);
    expect(dupes, `duplicate buff ids: ${dupes.join(", ")}`).toEqual([]);
  });
});

describe("conditional-buffs.json invariants the schema can't express", () => {
  it("every buff actually does something", () => {
    // A buff with no effects, no per-hit bonus and no shred renders a checkbox that changes
    // nothing — it looks functional and silently isn't.
    const inert = buffs
      .filter((b) => !b.effects.length && !b.talentDmgBonuses?.length && !b.resShred)
      .map((b) => b.id);
    expect(inert, `buffs with no effect of any kind: ${inert.join(", ")}`).toEqual([]);
  });

  it("every set-gated buff unlocks at a real set-bonus tier", () => {
    const bad = buffs
      .filter((b) => b.setId && b.minPieces !== undefined && b.minPieces !== 2 && b.minPieces !== 4)
      .map((b) => `${b.id} -> minPieces ${b.minPieces}`);
    expect(bad, `minPieces must be 2 or 4:\n${bad.join("\n")}`).toEqual([]);
  });

  it("every constellation gate is within C1–C6", () => {
    const bad = buffs
      .filter((b) => b.minConstellation !== undefined && (b.minConstellation < 1 || b.minConstellation > 6))
      .map((b) => `${b.id} -> C${b.minConstellation}`);
    expect(bad, `minConstellation out of range:\n${bad.join("\n")}`).toEqual([]);
  });

  it("every RES shred removes a positive amount", () => {
    const bad = buffs
      .filter((b) => b.resShred && b.resShred.pct <= 0)
      .map((b) => `${b.id} -> ${b.resShred?.pct}`);
    expect(bad, `resShred.pct must be positive (it is subtracted from enemy RES):\n${bad.join("\n")}`).toEqual([]);
  });

  it("every element-scoped RES shred lists at least one element", () => {
    // `elements: []` would silently never apply — that is what omitting the field is for.
    const bad = buffs.filter((b) => b.resShred?.elements && b.resShred.elements.length === 0).map((b) => b.id);
    expect(bad, `empty resShred.elements (omit the field for a universal shred): ${bad.join(", ")}`).toEqual([]);
  });

  it("every refinement series starts at the entry's own value", () => {
    // Index 0 IS R1. If it drifted from `value`, adding a series would silently change what an
    // unrefined weapon contributes — the one thing this feature must not do.
    const bad: string[] = [];
    for (const b of buffs) {
      for (const e of b.effects) {
        if (e.byRefinement && e.byRefinement[0] !== e.value) bad.push(`${b.id}.${e.key}: ${e.byRefinement[0]} != ${e.value}`);
      }
      for (const t of b.talentDmgBonuses ?? []) {
        if (t.byRefinement && t.byRefinement[0] !== t.value) bad.push(`${b.id}.talent: ${t.byRefinement[0]} != ${t.value}`);
      }
      const rs = b.resShred;
      if (rs?.byRefinement && rs.byRefinement[0] !== rs.pct) bad.push(`${b.id}.resShred: ${rs.byRefinement[0]} != ${rs.pct}`);
    }
    expect(bad, `byRefinement[0] must equal the base value:\n${bad.join("\n")}`).toEqual([]);
  });

  it("only weapon-gated buffs carry a refinement series", () => {
    // Artifact sets have no refinement, so a series on one would never be reachable.
    const bad = buffs
      .filter((b) => !b.weaponId)
      .filter((b) => b.effects.some((e) => e.byRefinement) || (b.talentDmgBonuses ?? []).some((t) => t.byRefinement))
      .map((b) => b.id);
    expect(bad, `byRefinement on a non-weapon buff: ${bad.join(", ")}`).toEqual([]);
  });

  it("every refinement series increases with rank", () => {
    const bad: string[] = [];
    const check = (id: string, series: number[] | undefined) => {
      if (!series) return;
      for (let i = 1; i < series.length; i++) {
        if (series[i]! < series[i - 1]!) bad.push(`${id}: ${series.join("/")}`);
      }
    };
    for (const b of buffs) {
      for (const e of b.effects) check(`${b.id}.${e.key}`, e.byRefinement);
      for (const t of b.talentDmgBonuses ?? []) check(`${b.id}.talent`, t.byRefinement);
    }
    expect(bad, `refinement series must be non-decreasing:\n${bad.join("\n")}`).toEqual([]);
  });

  it("every per-hit DMG bonus carries a non-zero value", () => {
    const bad = buffs
      .flatMap((b) => (b.talentDmgBonuses ?? []).map((t) => ({ id: b.id, t })))
      .filter(({ t }) => t.value === 0)
      .map(({ id, t }) => `${id} -> ${t.scopes.join("/")} = 0`);
    expect(bad, `zero-value talentDmgBonuses:\n${bad.join("\n")}`).toEqual([]);
  });
});

describe("constellations.json references resolve", () => {
  it("every key names a character in the dataset", () => {
    const dangling = Object.keys(dataset.constellationBonuses ?? {}).filter((id) => !characterIds.has(id));
    expect(dangling, `constellation bonuses for unknown characters: ${dangling.join(", ")}`).toEqual([]);
  });

  it("every level key is C1–C6", () => {
    const bad: string[] = [];
    for (const [charId, byLevel] of Object.entries(dataset.constellationBonuses ?? {})) {
      for (const level of Object.keys(byLevel)) {
        const n = Number(level);
        if (!Number.isInteger(n) || n < 1 || n > 6) bad.push(`${charId} -> "${level}"`);
      }
    }
    expect(bad, `constellation level keys must be "1".."6":\n${bad.join("\n")}`).toEqual([]);
  });
});

describe("weapon-refinements.json references resolve", () => {
  it("every key names a weapon in the dataset", () => {
    const dangling = Object.keys(dataset.weaponRefinements ?? {}).filter((id) => !weaponIds.has(id));
    expect(dangling, `refinements for unknown weapons: ${dangling.join(", ")}`).toEqual([]);
  });

  it("every rank key is R1–R5", () => {
    const bad: string[] = [];
    for (const [weaponId, byRank] of Object.entries(dataset.weaponRefinements ?? {})) {
      for (const rank of Object.keys(byRank)) {
        const n = Number(rank);
        if (!Number.isInteger(n) || n < 1 || n > 5) bad.push(`${weaponId} -> "${rank}"`);
      }
    }
    expect(bad, `refinement rank keys must be "1".."5":\n${bad.join("\n")}`).toEqual([]);
  });
});
