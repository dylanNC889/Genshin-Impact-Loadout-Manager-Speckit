import { test, expect } from "@playwright/test";

// US3 — build a team; live synergy; on-demand damage (FR-012..016).
test("build a team and evaluate synergy + damage", async ({ page }) => {
  await page.goto("/team");

  await page.getByLabel("Team slot 1 character").selectOption("hu-tao");
  await page.getByLabel("Team slot 2 character").selectOption("xingqiu");

  // Pyro + Hydro enables Vaporize.
  await expect(page.getByText("Vaporize")).toBeVisible();

  await page.getByRole("button", { name: /Calculate/ }).click();
  await expect(page.getByText("est. total")).toBeVisible();
});
