import { test, expect } from "@playwright/test";

// US1 — browse the roster and inspect a character (FR-001/002/004).
test("browse roster and inspect a character", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search characters").fill("Hu Tao");
  await page.getByRole("link", { name: /Hu Tao/ }).click();

  await expect(page.getByRole("heading", { name: "Hu Tao" })).toBeVisible();
  await expect(page.getByText("Max HP")).toBeVisible();
  await expect(page.getByText("CRIT DMG")).toBeVisible();
  // Skills are listed.
  await expect(page.getByText("Guide to Afterlife")).toBeVisible();
});
