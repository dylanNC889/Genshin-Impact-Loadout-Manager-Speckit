import { test, expect } from "@playwright/test";

// US3 — build a team via the icon-grid picker (#5 redesign); live synergy; on-demand damage
// (FR-012..016). The old slot dropdowns were replaced by a searchable picker + portrait slots.
test("build a team and evaluate synergy + damage", async ({ page }) => {
  await page.goto("/team");

  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await search.fill("Xingqiu");
  await page.locator(".picker-cell", { hasText: "Xingqiu" }).first().click();

  // Both picks now occupy portrait slots.
  await expect(page.locator(".portrait-slot.filled")).toHaveCount(2);

  // Pyro + Hydro enables Vaporize (scoped to the synergy chip — the reaction dropdown also
  // lists "Vaporize (2×)" etc.).
  await expect(page.locator(".chip", { hasText: "Vaporize" })).toBeVisible();

  // Damage assumptions are configurable (B2).
  await expect(page.getByLabel("Enemy level")).toBeVisible();
  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(page.getByText("est. total")).toBeVisible();

  // Per-character damage breakdown expands to labeled instances (A4).
  await page.locator(".dmg-detail summary").first().click();
  await expect(page.locator(".instances li").first()).toBeVisible();

  // The team is shareable via a link (B3).
  await expect(page.getByRole("button", { name: /Copy link/ })).toBeVisible();
});

// A2 — team-wide buffs from enablers fold into the estimate.
test("team buffs from enablers are applied", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await search.fill("Bennett");
  await page.locator(".picker-cell", { hasText: "Bennett" }).first().click();

  // Wait for details to load (double-Pyro resonance) before the on-demand calc.
  await expect(page.locator(".chip", { hasText: "Fervent Flames" })).toBeVisible();
  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(page.getByText("est. total")).toBeVisible();
  await expect(page.getByText("Team buffs (approx)")).toBeVisible();
  await expect(page.getByText(/Bennett: ATK field/)).toBeVisible();
});
