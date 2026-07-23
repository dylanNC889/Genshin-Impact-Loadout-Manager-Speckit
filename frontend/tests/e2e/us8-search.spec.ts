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

// D3 — release timeline groups characters/weapons by debut version.
test("release timeline lists versions newest-first", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Timeline", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.getByRole("heading", { name: "Release timeline" })).toBeVisible();
  await expect(page.locator(".tl-version").first()).toBeVisible();
  // a known pairing links through to a detail page
  await page.locator(".tl-chip", { hasText: "Hu Tao" }).click();
  await expect(page).toHaveURL(/\/character\/hu-tao$/);
});

// E2 — build planner aggregates materials across a wishlist.
test("build planner aggregates a wishlist", async ({ page }) => {
  await page.goto("/planner?chars=hu-tao,yelan");
  await expect(page.getByRole("heading", { name: /Total for 2 characters/ })).toBeVisible();
  await expect(page.locator(".mat-list li", { hasText: "Mora" }).first()).toBeVisible();
  await page.getByLabel("Add character").selectOption("arlecchino");
  await expect(page.getByRole("heading", { name: /Total for 3 characters/ })).toBeVisible();
});
