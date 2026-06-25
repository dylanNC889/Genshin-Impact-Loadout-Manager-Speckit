import { describe, it, expect } from "vitest";
import { validateArtifact } from "../src/index";
import type { ArtifactInstance } from "@app/contracts";
import { testDataset } from "./fixtures";

const rules = testDataset.slotStatRules;

describe("validateArtifact (T029 / FR-006, FR-007)", () => {
  it("accepts a valid flower (flat HP main, distinct substats)", () => {
    const art: ArtifactInstance = {
      slot: "Flower",
      setId: "gladiator",
      mainStat: { key: "HP", value: 4780 },
      subStats: [
        { key: "CRIT_RATE", value: 7 },
        { key: "ATK_PCT", value: 10 },
      ],
    };
    expect(validateArtifact(art, rules).ok).toBe(true);
  });

  it("rejects an invalid main stat for the slot (e.g., EM on a Flower)", () => {
    const art: ArtifactInstance = {
      slot: "Flower",
      setId: "gladiator",
      mainStat: { key: "EM", value: 187 },
      subStats: [],
    };
    const res = validateArtifact(art, rules);
    expect(res.ok).toBe(false);
    expect(res.errors[0]?.code).toBe("INVALID_ARTIFACT_MAIN_STAT");
    expect(res.errors[0]?.remedy).toContain("HP");
  });

  it("rejects a substat equal to the main stat", () => {
    const art: ArtifactInstance = {
      slot: "Sands",
      setId: "crimson",
      mainStat: { key: "ATK_PCT", value: 46.6 },
      subStats: [{ key: "ATK_PCT", value: 5 }],
    };
    const codes = validateArtifact(art, rules).errors.map((e) => e.code);
    expect(codes).toContain("SUBSTAT_EQUALS_MAIN");
  });

  it("rejects duplicate substats and more than four", () => {
    const art: ArtifactInstance = {
      slot: "Circlet",
      setId: "crimson",
      mainStat: { key: "CRIT_RATE", value: 31.1 },
      subStats: [
        { key: "ATK_PCT", value: 5 },
        { key: "ATK_PCT", value: 5 },
        { key: "EM", value: 16 },
        { key: "ER", value: 6 },
        { key: "HP", value: 200 },
      ],
    };
    const codes = validateArtifact(art, rules).errors.map((e) => e.code);
    expect(codes).toContain("DUPLICATE_SUBSTAT");
    expect(codes).toContain("TOO_MANY_SUBSTATS");
  });

  it("every error carries an actionable code + message (Principle III)", () => {
    const art: ArtifactInstance = {
      slot: "Plume",
      setId: "gladiator",
      mainStat: { key: "HP_PCT", value: 46.6 },
      subStats: [],
    };
    const res = validateArtifact(art, rules);
    expect(res.ok).toBe(false);
    for (const e of res.errors) {
      expect(e.code).toBeTruthy();
      expect(e.message.length).toBeGreaterThan(0);
    }
  });
});
