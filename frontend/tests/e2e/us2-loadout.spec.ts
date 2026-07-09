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
