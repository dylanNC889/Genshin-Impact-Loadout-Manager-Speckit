import { test, expect } from "@playwright/test";

// B7 — the top-bar global search jumps to any character / weapon / artifact set.
test("global search navigates to results", async ({ page }) => {
  await page.goto("/");

  // character
  await page.getByLabel("Global search").fill("Hu Tao");
  await expect(page.locator(".search-group-title", { hasText: "Characters" })).toBeVisible();
  await page.locator(".search-item", { hasText: "Hu Tao" }).click();
  await expect(page).toHaveURL(/\/character\/hu-tao$/);

  // weapon
  await page.getByLabel("Global search").fill("Staff of Homa");
  await page.locator(".search-item", { hasText: "Staff of Homa" }).click();
  await expect(page).toHaveURL(/\/weapon\/staff-of-homa$/);

  // artifact set
  await page.getByLabel("Global search").fill("Marechaussee");
  await page.locator(".search-item", { hasText: "Marechaussee Hunter" }).click();
  await expect(page).toHaveURL(/\/artifact\/marechaussee-hunter$/);
});
