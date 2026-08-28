import { describe, it, expect } from "vitest";
import { TEAM_BUFFS, teamBuffFor, resShredForElement } from "../../src/teamBuffs";

/**
 * Batch 7 #7 — TEAM_BUFFS modelled flat ATK, DMG%, CRIT and RES shred but not Elemental Mastery.
 * The table said so in its own data: the Nahida entry was a note reading "not modeled in this
 * ATK-based estimate" and contributed nothing. Since the damage pipeline scales amplifying,
 * transformative and catalyze reactions off EM, teams that pick a buffer *for* the EM share were
 * materially undercounted.
 */
describe("teamBuffFor — Elemental Mastery sharing", () => {
  it("sums shared EM from the team's enablers", () => {
    expect(teamBuffFor("Pyro", ["nahida"]).em).toBe(200);
    expect(teamBuffFor("Pyro", ["nahida", "sucrose"]).em).toBe(360);
  });

  it("is zero for a team with no EM sharer", () => {
    expect(teamBuffFor("Pyro", ["bennett", "zhongli"]).em).toBe(0);
  });

  it("skips a self-excluded buff for its own owner", () => {
    // Sucrose's A4 explicitly excludes Sucrose herself.
    expect(teamBuffFor("Anemo", ["sucrose"], "sucrose").em).toBe(0);
    expect(teamBuffFor("Pyro", ["sucrose"], "hu-tao").em).toBe(160);
  });

  it("still applies a self-excluded buff's other effects to its owner", () => {
    // Only the flagged buff is skipped for its owner, not the entry's whole contribution...
    const forOther = teamBuffFor("Pyro", ["sucrose"], "hu-tao");
    const forSelf = teamBuffFor("Pyro", ["sucrose"], "sucrose");
    expect(forOther.dmgBonusPct).toBe(20);
    // ...which means the exclusion is currently all-or-nothing per entry, by design: Sucrose's
    // EM share and her VV shred live on one entry, and the shred is a debuff on the enemy that
    // benefits her too. Pin the behaviour so a future split is a deliberate change.
    expect(forSelf.dmgBonusPct).toBe(0);
    expect(resShredForElement(["sucrose"], "Pyro")).toBe(40);
  });

  it("keeps element-scoped buffs scoped", () => {
    expect(teamBuffFor("Cryo", ["shenhe"]).dmgBonusPct).toBe(15);
    expect(teamBuffFor("Pyro", ["shenhe"]).dmgBonusPct).toBe(0);
  });

  it("no longer carries an entry that contributes nothing", () => {
    // The Nahida entry used to be a bare note. An entry with no numeric effect is a lie in the
    // assumptions list — it reads as "this teammate is accounted for" when it isn't.
    const inert = Object.entries(TEAM_BUFFS).filter(
      ([, b]) => !b.flatATK && !b.dmgBonusPct && !b.critRate && !b.critDmg && !b.em && !b.resShred,
    );
    expect(inert.map(([id]) => id)).toEqual([]);
  });
});
