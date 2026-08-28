import { test, expect } from "@playwright/test";

// US2 — gear a character; final stats recalculate; active set bonus + its effect text show
// (FR-005..011, FR-022) — equipping two Crimson Witch pieces triggers the 2-piece bonus.
test("equip a weapon and artifacts, see recalculation + set bonus", async ({ page }) => {
  await page.goto("/character/hu-tao");

  await page.getByLabel(/^Weapon/).selectOption({ label: "Staff of Homa" });
  // Two pieces of the same set → the 2-piece bonus activates.
  await page.getByLabel("Flower set").selectOption({ label: "Crimson Witch of Flames" });
  await page.getByLabel("Goblet set").selectOption({ label: "Crimson Witch of Flames" });
  await page.getByLabel("Goblet main stat").selectOption("PYRO_DMG");

  // Active set-bonus list shows the tier and its effect text (the set-bonus-text follow-up).
  await expect(page.getByText(/Crimson Witch of Flames · 2-piece/)).toBeVisible();
  await expect(page.getByText("Pyro DMG Bonus +15%")).toBeVisible();

  // The build is shareable via a link (B3).
  await expect(page.getByRole("button", { name: /Copy link/ })).toBeVisible();
});

// #6 — the weapon and artifact-set pickers surface a "Recommended (KQM)" optgroup on top.
test("loadout pickers surface KQM recommendations", async ({ page }) => {
  await page.goto("/character/hu-tao");

  const recWeapons = page.locator('#weapon optgroup[label="★ Recommended (KQM)"]');
  await expect(recWeapons.locator("option", { hasText: "Staff of Homa" })).toHaveCount(1);

  // Selecting a set reveals the set picker's recommended group too.
  await page.getByLabel("Goblet set").selectOption({ label: "Crimson Witch of Flames" });
  const recSets = page.locator('select[aria-label="Goblet set"] optgroup[label="★ Recommended (KQM)"]');
  await expect(recSets.locator("option", { hasText: "Crimson Witch of Flames" })).toHaveCount(1);
});

test("optimised build suggestion applies to the editor", async ({ page }) => {
  await page.goto("/character/hu-tao");

  await expect(page.getByText("Suggested build")).toBeVisible();
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  // Apply populates the weapon (Hu Tao → Staff of Homa) and all five artifact slots.
  await expect(page.getByLabel(/^Weapon/)).toHaveValue("staff-of-homa");
  await expect(page.getByLabel("Goblet set")).toHaveValue("crimson-witch-of-flames");
  // …with well-rolled substats (4 shared upgrade rolls per artifact).
  await expect(page.getByText("Upgrades: 4/4").first()).toBeVisible();
});

// A — conditional buff toggles (weapon passive / 4pc set) fold into Final Stats.
test("conditional buff toggle changes final stats", async ({ page }) => {
  await page.goto("/character/hu-tao");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByLabel("Goblet set")).toHaveValue("crimson-witch-of-flames");

  // Crimson Witch 4pc conditional buff appears and is on by default.
  const cw = page.locator(".cond-buff", { hasText: "Crimson Witch" });
  await expect(cw).toBeVisible();
  const cwBox = cw.locator("input");
  await expect(cwBox).toBeChecked();

  const pyroPct = async () => {
    const row = page.locator(".final-stats .stat-row").filter({ hasText: /pyro dmg bonus/i });
    const v = (await row.locator(".stat-value").first().textContent().catch(() => null)) ?? "";
    const m = v.match(/([\d.]+)%/);
    return m ? Number(m[1]) : null;
  };
  const before = (await pyroPct()) ?? 0;
  expect(before).toBeGreaterThan(40); // goblet 46.6 + 2pc 15 + buff 22.5
  // Toggling the 4pc buff off drops the Pyro DMG bonus by ~22.5%.
  await cwBox.uncheck();
  await expect.poll(pyroPct).toBeCloseTo(before - 22.5, 0);
});

// A1 — weapon refinement feeds the final stats (Staff of Homa gives HP%).
test("weapon refinement changes final stats", async ({ page }) => {
  await page.goto("/character/hu-tao");
  await page.getByLabel(/^Weapon/).selectOption({ label: "Staff of Homa" });

  const maxHp = () =>
    page.locator(".final-stats .stat-row", { hasText: "Max HP" }).locator(".stat-value");
  await page.getByLabel("Refinement").selectOption("1");
  const hp1 = Number((await maxHp().textContent())!.replace(/,/g, ""));
  await page.getByLabel("Refinement").selectOption("5");
  const hp5 = Number((await maxHp().textContent())!.replace(/,/g, ""));
  expect(hp5).toBeGreaterThan(hp1);
});

// Batch 7 #1 — a share link must reproduce the build exactly, including conditional buffs the
// author deliberately switched OFF. The payload used to carry only 5 fields, so the recipient
// silently saw different Final Stats (and, since the per-hit/RES-shred work, different damage).
test("share link round-trips conditional buffs, notes and tags", async ({ page, context }) => {
  await page.goto("/character/hu-tao");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByLabel("Goblet set")).toHaveValue("crimson-witch-of-flames");

  // Turn the default-on Crimson Witch 4pc buff OFF — the case a defaults-pass would clobber.
  const cwBox = page.locator(".cond-buff", { hasText: "Crimson Witch" }).locator("input");
  await expect(cwBox).toBeChecked();
  await cwBox.uncheck();

  await page.getByLabel("Loadout notes").fill("share round-trip");
  await page.getByLabel("Loadout tags").fill("alpha, beta");

  const pyroPct = async () => {
    const row = page.locator(".final-stats .stat-row").filter({ hasText: /pyro dmg bonus/i });
    const v = (await row.locator(".stat-value").first().textContent().catch(() => null)) ?? "";
    const m = v.match(/([\d.]+)%/);
    return m ? Number(m[1]) : null;
  };
  const expected = await pyroPct();
  expect(expected).not.toBeNull();

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: /Copy link/ }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("build=");

  // Open the link in a fresh page (no shared editor state).
  const fresh = await context.newPage();
  await fresh.goto(link);
  const freshCw = fresh.locator(".cond-buff", { hasText: "Crimson Witch" }).locator("input");
  await expect(freshCw).toBeVisible();
  await expect(freshCw).not.toBeChecked(); // the author's "off" survived the trip
  await expect(fresh.getByLabel("Loadout notes")).toHaveValue("share round-trip");
  await expect(fresh.getByLabel("Loadout tags")).toHaveValue("alpha, beta");

  const freshPyro = async () => {
    const row = fresh.locator(".final-stats .stat-row").filter({ hasText: /pyro dmg bonus/i });
    const v = (await row.locator(".stat-value").first().textContent().catch(() => null)) ?? "";
    const m = v.match(/([\d.]+)%/);
    return m ? Number(m[1]) : null;
  };
  await expect.poll(freshPyro).toBeCloseTo(expected!, 1);
  await fresh.close();
});

// A link created before the payload carried conditionals must still open, falling back to the
// editor's defaults rather than erroring or coming up empty.
test("a legacy 5-field share link still opens", async ({ page }) => {
  const legacy = {
    level: 90,
    weaponId: "staff-of-homa",
    constellation: 0,
    refinement: 1,
    artifacts: [
      { slot: "Goblet", setId: "crimson-witch-of-flames", mainStat: { key: "PYRO_DMG", value: 46.6 }, subStats: [] },
    ],
  };
  const code = await page.evaluate((obj) => {
    const json = JSON.stringify(obj);
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }, legacy);

  await page.goto(`/character/hu-tao?build=${code}`);
  await expect(page.getByLabel(/^Weapon/)).toHaveValue("staff-of-homa");
  await expect(page.getByLabel("Goblet set")).toHaveValue("crimson-witch-of-flames");
});

// Batch 7 #8 — `minConstellation` had been in the schema since batch 6 and was used by 0 of 34
// buffs, so the conditional half of the constellation system was unmodelled and raising the
// constellation barely changed a number.
test("constellation buffs unlock at their gate and stay on their own character", async ({ page }) => {
  await page.goto("/character/xingqiu");
  await expect(page.locator("table.scaling").first()).toBeVisible();

  const peak = (talent: string) =>
    page.evaluate((want) => {
      const nodes = [...document.querySelectorAll(".skill-type, table.scaling")];
      let type: string | null = null;
      for (const n of nodes) {
        if (n.classList.contains("skill-type")) {
          type = n.textContent!.trim();
          continue;
        }
        if (type !== want) {
          type = null;
          continue;
        }
        const vals = [...n.querySelectorAll(".scale-dmg")]
          .map((td) => Number(td.textContent!.replace(/[^0-9]/g, "")))
          .filter(Boolean);
        return vals.length ? Math.max(...vals) : 0;
      }
      return 0;
    }, talent);

  // C0: no constellation buffs offered.
  await expect(page.locator(".cond-buff", { hasText: "Xingqiu C" })).toHaveCount(0);
  await expect.poll(() => peak("ElementalSkill")).toBeGreaterThan(0);

  // C4 unlocks his +50% Elemental Skill DMG — and only the Skill moves.
  const naBefore = await peak("NormalAttack");
  await page.getByLabel("Constellation").selectOption("4");
  await expect(page.locator(".cond-buff", { hasText: "Xingqiu C4" })).toBeVisible();
  const skillC4 = await peak("ElementalSkill");

  await page.getByLabel("Constellation").selectOption("2"); // below the C4 gate again
  await expect(page.locator(".cond-buff", { hasText: "Xingqiu C4" })).toHaveCount(0);
  expect(await peak("ElementalSkill")).toBeLessThan(skillC4);
  // The C2 RES shred is still on, so compare NA against C2 rather than C0.
  expect(await peak("NormalAttack")).toBeGreaterThan(naBefore);

  // Listed under their own heading, not mixed in with gear buffs.
  await page.getByLabel("Constellation").selectOption("4");
  await expect(page.locator(".cond-subhead", { hasText: "From constellations" })).toBeVisible();

  // A different character at C6 sees none of them.
  await page.goto("/character/hu-tao");
  await page.getByLabel("Constellation").selectOption("6");
  await expect(page.locator(".cond-buff", { hasText: "Xingqiu" })).toHaveCount(0);
  await expect(page.getByText(/Constellation effects aren't modelled for this character yet/)).toBeVisible();
});
