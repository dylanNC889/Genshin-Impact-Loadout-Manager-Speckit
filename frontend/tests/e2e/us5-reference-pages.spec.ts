import { test, expect } from "@playwright/test";

// #1 — browsable Weapons and Artifacts list pages, reached from the nav.
test("browse the weapons page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Weapons" }).click();
  await expect(page).toHaveURL(/\/weapons$/);

  await page.getByLabel("Search weapons").fill("Staff of Homa");
  const card = page.locator(".char-card", { hasText: "Staff of Homa" });
  await expect(card).toHaveCount(1);
  await expect(card.getByText(/Base ATK/)).toBeVisible();
});

test("browse the artifacts page and see set bonuses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Artifacts" }).click();
  await expect(page).toHaveURL(/\/artifacts$/);

  await page.getByLabel("Search artifact sets").fill("Crimson Witch");
  const card = page.locator(".set-card", { hasText: "Crimson Witch of Flames" });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Pyro DMG Bonus +15%")).toBeVisible();
});
