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

  // Hero uses the full wide wish splash as a banner (#5).
  await expect(page.locator(".char-hero.has-splash .char-hero-bg")).toBeVisible();

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

// B8 — compare two characters side-by-side, incl. richer stats and a per-side build (#8).
test("compare two characters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Compare characters/ }).click();
  await expect(page).toHaveURL(/\/character-compare$/);
  await page.getByLabel("Character A").selectOption("hu-tao");
  await page.getByLabel("Character B").selectOption("arlecchino");
  await expect(page.locator(".compare-table")).toBeVisible();
  // Expanded stat rows: base HP + combat stats now included.
  await expect(page.locator(".compare-table td", { hasText: "Max HP" })).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "CRIT DMG" })).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "Energy Recharge" })).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "Top weapon (KQM)" })).toBeVisible();

  // A saved build can be selected per side to compare final geared stats.
  await page.goto("/character/hu-tao");
  await page.getByLabel("Loadout name").fill("Hu Tao CompareE2E");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/character-compare?a=hu-tao&b=arlecchino");
  await page.getByLabel("Build for character A").selectOption({ label: "Hu Tao CompareE2E" });
  await expect(page).toHaveURL(/ba=/);
  await expect(page.locator(".compare-table tr", { hasText: "Stats from" }).locator("td").nth(1)).toHaveText(
    "Hu Tao CompareE2E",
  );

  // cleanup
  await page.goto("/saved");
  const rows = page.locator(".saved-list li", { hasText: "Hu Tao CompareE2E" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});

// #3/#10 — owned toggle + saved-builds picker on the character detail page.
test("character detail: owned toggle and load a saved build", async ({ page }) => {
  await page.goto("/character/diluc");

  // Owned toggle (E1) mirrored from the roster.
  await page.getByRole("button", { name: "Mark Diluc owned" }).click();
  await expect(page.getByRole("button", { name: "Mark Diluc not owned" })).toBeVisible();

  // Save a build, then it appears as a loadable chip.
  await page.getByLabel("Loadout name").fill("Diluc DetailBuild");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/character/diluc");
  const chip = page.locator(".saved-build-chip", { hasText: "Diluc DetailBuild" });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/loadout=/);
  await expect(page.locator(".saved-build-chip.active", { hasText: "Diluc DetailBuild" })).toBeVisible();

  // cleanup
  await page.goto("/saved");
  const rows = page.locator(".saved-list li", { hasText: "Diluc DetailBuild" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});

// Roster "has build" filter — show only characters with a saved loadout.
test("filter roster to characters with a saved build", async ({ page }) => {
  // create a build so at least one character qualifies
  await page.goto("/character/diluc");
  await page.getByLabel("Loadout name").fill("Diluc RosterHasBuild");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/");
  await expect(page.locator(".char-card", { hasText: "Diluc" })).toBeVisible(); // roster loaded
  const allCount = await page.locator(".char-card").count();
  await page.getByLabel("Characters with a saved build only").check();
  await expect(page).toHaveURL(/built=1/);
  await expect(page.locator(".char-card", { hasText: "Diluc" })).toBeVisible();
  expect(await page.locator(".char-card").count()).toBeLessThan(allCount);

  // cleanup
  await page.goto("/saved");
  const rows = page.locator(".saved-list li", { hasText: "Diluc RosterHasBuild" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
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
