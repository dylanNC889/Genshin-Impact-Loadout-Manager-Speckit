import { describe, it, expect } from "vitest";
import { assessSynergy } from "../src/index";
import type { SynergyMember } from "../src/index";

describe("assessSynergy (T038/T039 / FR-013, FR-014, FR-015, SC-005)", () => {
  it("reports Pyro resonance for two Pyro members (FR-013)", () => {
    const members: SynergyMember[] = [
      { element: "Pyro", roles: ["MainDPS"] },
      { element: "Pyro", roles: ["SubDPS"] },
    ];
    const a = assessSynergy(members);
    expect(a.resonances.map((r) => r.name)).toContain("Fervent Flames");
  });

  it("lists correct reactions for a mixed composition (FR-014)", () => {
    const members: SynergyMember[] = [
      { element: "Pyro", roles: ["MainDPS"] },
      { element: "Hydro", roles: ["Healer"] },
      { element: "Cryo", roles: ["SubDPS"] },
      { element: "Electro", roles: ["Battery"] },
    ];
    const reactions = assessSynergy(members).possibleReactions;
    // Pyro+Hydro=Vaporize, Pyro+Cryo=Melt, Pyro+Electro=Overloaded,
    // Hydro+Cryo=Frozen, Hydro+Electro=Electro-Charged, Cryo+Electro=Superconduct
    for (const r of ["Vaporize", "Melt", "Overloaded", "Frozen", "Electro-Charged", "Superconduct"]) {
      expect(reactions).toContain(r);
    }
  });

  it("surfaces role-coverage gaps (no healer/shielder)", () => {
    const members: SynergyMember[] = [
      { element: "Pyro", roles: ["MainDPS"] },
      { element: "Pyro", roles: ["SubDPS"] },
    ];
    const gaps = assessSynergy(members).roleCoverage.gaps;
    expect(gaps).toContain("Healer");
    expect(gaps).toContain("Shielder");
  });

  it("marks a team of fewer than 4 as incomplete but still assesses it (US3 scenario 5)", () => {
    const a = assessSynergy([{ element: "Anemo", roles: ["Buffer"] }]);
    expect(a.complete).toBe(false);
    expect(a.notes.some((n) => n.includes("1/4"))).toBe(true);
  });

  it("never returns an empty assessment, even for an off-meta solo team (edge case)", () => {
    const a = assessSynergy([{ element: "Geo", roles: [] }]);
    // No resonance, no reaction, but the object is still meaningful.
    expect(a.resonances).toEqual([]);
    expect(a.possibleReactions).toEqual([]);
    expect(a.notes.length).toBeGreaterThan(0);
    expect(a.roleCoverage.gaps.length).toBeGreaterThan(0);
  });

  it("produces a scored rating with a letter grade (FR-015)", () => {
    const strong: SynergyMember[] = [
      { element: "Pyro", roles: ["MainDPS"] },
      { element: "Hydro", roles: ["SubDPS"] },
      { element: "Pyro", roles: ["Buffer"] },
      { element: "Cryo", roles: ["Healer"] },
    ];
    const a = assessSynergy(strong);
    expect(typeof a.rating.score).toBe("number");
    expect(["S", "A", "B", "C"]).toContain(a.rating.grade);
    // A weak solo team should not outscore the strong team.
    const weak = assessSynergy([{ element: "Geo", roles: [] }]);
    expect(a.rating.score).toBeGreaterThan(weak.rating.score);
  });

  it("is deterministic and order-independent for reactions", () => {
    const m1: SynergyMember[] = [
      { element: "Pyro", roles: [] },
      { element: "Hydro", roles: [] },
    ];
    const m2: SynergyMember[] = [
      { element: "Hydro", roles: [] },
      { element: "Pyro", roles: [] },
    ];
    expect(assessSynergy(m1).possibleReactions).toEqual(assessSynergy(m2).possibleReactions);
  });
});
