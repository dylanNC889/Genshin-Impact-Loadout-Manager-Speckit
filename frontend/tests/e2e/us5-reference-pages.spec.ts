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

  // Click through to the weapon detail page (B3) with a "recommended by" reverse lookup.
  await card.click();
  await expect(page).toHaveURL(/\/weapon\/staff-of-homa$/);
  await expect(page.getByRole("heading", { name: "Staff of Homa", level: 1 })).toBeVisible();
  // Hu Tao is the 1:1 signature holder (curated), shown in the highlighted signature slot.
  await expect(page.getByText("★ Signature weapon of")).toBeVisible();
  await expect(page.locator(".used-by-chip.sig", { hasText: "Hu Tao" })).toBeVisible();

  // Ascension materials card (D1).
  await expect(page.getByRole("heading", { name: "Ascension materials" })).toBeVisible();
  await expect(page.locator(".mat-list li", { hasText: "Mora" }).first()).toBeVisible();

  // Passive ability with a working R1–R5 refinement slider (weapon-page-details).
  await expect(page.getByRole("heading", { name: "Passive ability" })).toBeVisible();
  const firstHl = page.locator(".passive-text .hl").first();
  const atR1 = await firstHl.textContent();
  const slider = page.getByLabel("Refinement");
  await slider.fill("5");
  await expect(slider).toHaveValue("5");
  await expect(firstHl).not.toHaveText(atR1 ?? "");
});

// B5 — compare two weapons side-by-side at a chosen refinement.
test("compare two weapons", async ({ page }) => {
  await page.goto("/weapons");
  await page.getByRole("link", { name: /Compare weapons/ }).click();
  await expect(page).toHaveURL(/\/weapon-compare$/);

  await page.getByLabel("Weapon A").selectOption({ label: "Staff of Homa" });
  await page.getByLabel("Weapon B").selectOption({ label: "Vortex Vanquisher" });
  await expect(page.locator(".compare-table")).toBeVisible();
  await expect(page.locator(".compare-table td", { hasText: "Base ATK" })).toBeVisible();

  await page.getByLabel("Refinement").selectOption("5");
  await expect(page.getByRole("heading", { name: "Passives (R5)" })).toBeVisible();
});

test("browse the artifacts page and see set bonuses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Artifacts" }).click();
  await expect(page).toHaveURL(/\/artifacts$/);

  await expect(page.getByLabel("Sort by")).toBeVisible();
  await page.getByLabel("Search artifact sets").fill("Crimson Witch");
  const card = page.locator(".set-card", { hasText: "Crimson Witch of Flames" });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Pyro DMG Bonus +15%")).toBeVisible();
});

// Artifact detail: same signature/BiS/recommended treatment as weapons.
test("artifact detail shows the signature set holder", async ({ page }) => {
  // Marechaussee Hunter debuted in 4.0 with Lyney → derived as its signature set.
  await page.goto("/artifact/marechaussee-hunter");
  await expect(page.getByRole("heading", { name: "Marechaussee Hunter", level: 1 })).toBeVisible();
  await expect(page.getByText("★ Signature set of")).toBeVisible();
  await expect(page.locator(".used-by-chip.sig", { hasText: "Lyney" })).toBeVisible();
  await expect(page.getByText("Best-in-slot for")).toBeVisible();

  // The five named pieces are listed with their art (artifact enrichment).
  await expect(page.getByRole("heading", { name: "Pieces" })).toBeVisible();
  await expect(page.locator(".piece", { hasText: "Hunter's Brooch" })).toBeVisible();
  await expect(page.locator(".piece-list .piece")).toHaveCount(5);

  // Farming domain + expandable per-piece lore.
  await expect(page.getByText(/Farmed at/)).toBeVisible();
  await page.locator(".piece-lore summary").first().click();
  await expect(page.locator(".piece-story").first()).toBeVisible();
});

// D2 — food buffs reference page.
test("browse the food buffs page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Food", exact: true }).click();
  await expect(page).toHaveURL(/\/food$/);
  await expect(page.getByRole("heading", { name: "Food buffs" })).toBeVisible();
  await page.getByLabel("Search food").fill("Adeptus");
  await expect(page.locator(".set-card", { hasText: "Adeptus" }).first()).toBeVisible();
  await page.getByLabel("Search food").fill("");
  await page.getByLabel("Filter by type").selectOption("Revival");
  await expect(page.locator(".set-card").first()).toBeVisible();
});
