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

  // The team is shareable via a link (B3).
  await expect(page.getByRole("button", { name: /Copy link/ })).toBeVisible();
});
