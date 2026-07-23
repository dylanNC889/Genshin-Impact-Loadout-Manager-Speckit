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
  // Per-talent damage estimate (A7).
  await expect(skills.locator(".scale-dmg").filter({ hasText: "≈" }).first()).toBeVisible();

  // Constellations section is present (B1).
  const cons = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Constellations" }) });
  await expect(cons.getByText("C1", { exact: true })).toBeVisible();

  // Materials "what to farm" card (D1).
  const mats = page.locator(".card").filter({ has: page.getByRole("heading", { name: /Materials/ }) });
  await expect(mats.locator(".mat-list li", { hasText: "Mora" }).first()).toBeVisible();
  await expect(mats.getByText("One talent → Lv 10")).toBeVisible();
});

// B8 — compare two characters side-by-side.
test("compare two characters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Compare characters/ }).click();
  await expect(page).toHaveURL(/\/character-compare$/);
  await page.getByLabel("Character A").selectOption("hu-tao");
  await page.getByLabel("Character B").selectOption("arlecchino");
  await expect(page.locator(".compare-table")).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "Base HP (Lv 90)" })).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "Top weapon (KQM)" })).toBeVisible();
});

// C5 — roster filters are reflected in the URL and restored on load.
test("roster filters are shareable via the URL", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Filter by element").selectOption("Pyro");
  await expect(page).toHaveURL(/element=Pyro/);
  await page.goto("/?element=Pyro&rarity=5");
  await expect(page.getByLabel("Filter by element")).toHaveValue("Pyro");
  await expect(page.getByLabel("Filter by rarity")).toHaveValue("5");
});

// E1 — mark characters owned and filter to "Owned only".
test("ownership toggle + owned-only filter", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search characters").fill("Hu Tao");
  await page.getByRole("button", { name: "Mark Hu Tao owned" }).click();
  await expect(page.getByRole("button", { name: "Mark Hu Tao not owned" })).toBeVisible();

  await page.getByLabel("Search characters").fill("");
  await page.getByLabel("Owned characters only").check();
  await expect(page.locator(".char-card")).toHaveCount(1);
  await expect(page.locator(".char-card", { hasText: "Hu Tao" })).toBeVisible();
});
