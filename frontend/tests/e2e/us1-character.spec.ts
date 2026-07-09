import { test, expect } from "@playwright/test";

// US1 — browse the roster and inspect a character (FR-001/002/004),
// plus the intro panel (#4), level slider (#2), talent scaling stat (#7), skill icons (#8).
test("browse roster and inspect a character", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search characters").fill("Hu Tao");
  // Roster upgrades (B4): rarity filter + per-card favourite toggle.
  await expect(page.getByLabel("Filter by rarity")).toBeVisible();
  await expect(page.getByRole("button", { name: /Favourite Hu Tao/ })).toBeVisible();
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
  // (Scoped to the Skills card — the C1 constellation description also names this skill.)
  const skills = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Skills" }) });
  await expect(skills.locator(".skill-name", { hasText: "Guide to Afterlife" })).toBeVisible();
  await expect(skills.locator(".skill-icon").first()).toBeVisible();
  await expect(page.locator(".scaling .scale-stat").first()).toContainText(/of (ATK|Max HP|DEF|EM)/);

  // Constellations section is present (B1).
  const cons = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Constellations" }) });
  await expect(cons.getByText("C1", { exact: true })).toBeVisible();
});
