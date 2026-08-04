import { test, expect } from "@playwright/test";

// US3 — build a team via the icon-grid picker (#5 redesign); live synergy + live damage
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

  // Damage assumptions are configurable (B2) and the estimate updates live (#4 — no button).
  await expect(page.getByLabel("Enemy level")).toBeVisible();
  await expect(page.getByText("estimated damage / rotation")).toBeVisible();

  // Per-character damage bars expand to labeled instances (A4).
  await page.locator(".dmg-detail summary").first().click();
  await expect(page.locator(".instances li").first()).toBeVisible();

  // The team is shareable via a link (B3).
  await expect(page.getByRole("button", { name: /Copy link/ })).toBeVisible();
});

// A2 — team-wide buffs from enablers fold into the estimate.
test("team buffs from enablers are applied", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await search.fill("Bennett");
  await page.locator(".picker-cell", { hasText: "Bennett" }).first().click();

  // Live estimate once details load (double-Pyro resonance).
  await expect(page.locator(".chip", { hasText: "Fervent Flames" })).toBeVisible();
  await expect(page.getByText("estimated damage / rotation")).toBeVisible();
  // Team buffs are listed in the collapsible assumptions.
  await page.locator(".dmg-assumptions summary").click();
  await expect(page.getByText("Team buffs (approx)")).toBeVisible();
  await expect(page.getByText(/Bennett: ATK field/)).toBeVisible();

  // Extra reaction adds its own breakdown line (A6), recomputed live.
  await page.getByLabel("Extra reaction").selectOption("Overloaded");
  const summaries = page.locator(".dmg-detail summary");
  for (let i = 0, n = await summaries.count(); i < n; i++) await summaries.nth(i).click();
  await expect(page.locator(".instances li", { hasText: "Overloaded" })).toBeVisible();
});

// The picker can be filtered to characters that have a saved build.
test("filter the team picker to characters with a saved build", async ({ page }) => {
  await page.goto("/character/diluc");
  await page.getByLabel("Loadout name").fill("Diluc TeamFilter");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/team");
  const cells = page.locator(".picker-cell");
  await expect(page.locator(".picker-cell", { hasText: "Diluc" })).toBeVisible(); // roster loaded
  const allCount = await cells.count();
  await page.getByLabel("Only characters with a saved build").check();
  await expect(page.locator(".picker-cell", { hasText: "Diluc" })).toBeVisible();
  expect(await cells.count()).toBeLessThan(allCount);

  // cleanup — remove every matching row (guards against leftovers from earlier runs)
  await page.goto("/saved");
  const rows = page.locator(".saved-list li", { hasText: "Diluc TeamFilter" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});

// A9 — auto-detect the reaction from the team's elements.
test("auto-detect reaction from team elements", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await search.fill("Xingqiu");
  await page.locator(".picker-cell", { hasText: "Xingqiu" }).first().click();
  await expect(page.locator(".chip", { hasText: "Vaporize" })).toBeVisible(); // details loaded

  await page.getByLabel("Auto-detect reaction").check();
  await expect(page.locator(".dmg-auto")).toContainText(/Auto-detected reaction:/);
  await expect(page.locator(".dmg-auto")).toContainText(/Vaporize/i);
});

// A10 — approximate ER requirement check for energy-hungry members.
test("show an ER-requirement flag for an energy-hungry member", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Xiangling");
  await page.locator(".picker-cell", { hasText: "Xiangling" }).first().click();

  // Xiangling wants ~200% ER; a bare (100% base) build is flagged short.
  const energy = page.locator(".energy-list li", { hasText: "Xiangling" });
  await expect(energy).toBeVisible();
  await expect(energy).toHaveClass(/er-short/);
  await expect(energy).toContainText("100% / ~200%");
});

// N — the character page lists the saved teams it appears in.
test("character page lists the teams it appears in", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await page.getByLabel("Team name").fill("N-Lookup Team");
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/character/hu-tao");
  const chip = page.locator(".in-team-chip", { hasText: "N-Lookup Team" });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/\/team\?team=/);

  // cleanup — delete the team (scoped to the Teams card)
  await page.goto("/saved");
  const teamsCard = page.locator(".card").filter({ has: page.getByRole("heading", { name: /^Teams/ }) });
  const rows = teamsCard.locator(".saved-list li", { hasText: "N-Lookup Team" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});

// A8 — enemy presets (per-element RES).
test("enemy preset disables manual inputs and recalculates", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  await search.fill("Hu Tao");
  await page.locator(".picker-cell", { hasText: "Hu Tao" }).first().click();
  await expect(page.getByLabel("Enemy level")).toBeEnabled();
  await page.getByLabel("Enemy preset").selectOption({ label: "Pyro-resistant — +50% Pyro" });
  await expect(page.getByLabel("Enemy level")).toBeDisabled();
  await expect(page.getByText("estimated damage / rotation")).toBeVisible();
});

// C — per-element effective RES: VV shreds swirlable elements only; Zhongli is universal.
test("effective RES readout is element-scoped", async ({ page }) => {
  await page.goto("/team");
  const search = page.getByLabel("Search characters to add");
  for (const n of ["Hu Tao", "Kaedehara Kazuha", "Zhongli"]) {
    await search.fill(n);
    await page.locator(".picker-cell", { hasText: n }).first().click();
  }
  await expect(page.getByText("estimated damage / rotation")).toBeVisible();
  // Pyro (swirlable) gets VV −40% + Zhongli −20% = −50%; Anemo gets only Zhongli −20% → −10%.
  await expect(page.locator(".res-chip", { hasText: "Pyro -50%" })).toBeVisible();
  await expect(page.locator(".res-chip", { hasText: "Anemo -10%" })).toBeVisible();
});
