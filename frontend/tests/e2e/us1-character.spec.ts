import { test, expect } from "@playwright/test";

// US1 — browse the roster and inspect a character (FR-001/002/004),
// plus the intro panel (#4), level slider (#2), talent scaling stat (#7), skill icons (#8).
test("browse roster and inspect a character", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search characters").fill("Hu Tao");
  await page.getByRole("link", { name: /Hu Tao/ }).click();

  await expect(page.getByRole("heading", { name: "Hu Tao", level: 1 })).toBeVisible();

  // Intro panel (#4): lore title.
  await expect(page.getByText("Fragrance in Thaw")).toBeVisible();

  // Base stats card (scoped — the same labels also appear in the Loadout "Final Stats" panel).
  const baseStats = page.locator(".card", { hasText: "Base Stats" });
  await expect(baseStats.getByText("Max HP")).toBeVisible();
  await expect(baseStats.getByText("CRIT DMG")).toBeVisible();

  // Level control is a range slider (#2).
  await expect(page.locator("#level")).toHaveAttribute("type", "range");

  // Skills are listed, each with an icon (#8) and a scaling row annotated with its stat (#7).
  await expect(page.getByText("Guide to Afterlife")).toBeVisible();
  await expect(page.locator(".skill-icon").first()).toBeVisible();
  await expect(page.locator(".scaling .scale-stat").first()).toContainText(/of (ATK|Max HP|DEF|EM)/);
});
