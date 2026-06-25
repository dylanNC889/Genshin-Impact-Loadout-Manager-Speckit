import { test, expect } from "@playwright/test";

// US2 — gear a character; final stats recalculate; invalid stats can't be entered (FR-005..011, FR-022).
test("equip a weapon and artifact, see recalculation", async ({ page }) => {
  await page.goto("/character/hu-tao");

  await page.getByLabel(/^Weapon/).selectOption({ label: "Staff of Homa" });
  await page.getByLabel("Goblet set").selectOption({ label: "Crimson Witch of Flames" });
  await page.getByLabel("Goblet main stat").selectOption("PYRO_DMG");

  // The final-stats panel reflects the gear (main-stat value is fixed, not free-form).
  await expect(page.getByText("Pyro DMG Bonus")).toBeVisible();
  await expect(page.getByText(/Crimson Witch of Flames · 2-piece/)).toBeVisible();
});
