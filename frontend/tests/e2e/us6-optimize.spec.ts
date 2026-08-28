import { test, expect } from "@playwright/test";

// B1 — import a GOOD inventory, optimize a character, apply the winning build.
const GOOD = JSON.stringify({
  format: "GOOD",
  version: 2,
  artifacts: [
    { setKey: "CrimsonWitchOfFlames", slotKey: "flower", rarity: 5, level: 20, mainStatKey: "hp", substats: [{ key: "critRate_", value: 7 }, { key: "critDMG_", value: 14 }] },
    { setKey: "CrimsonWitchOfFlames", slotKey: "plume", rarity: 5, level: 20, mainStatKey: "atk", substats: [{ key: "critRate_", value: 7 }] },
    { setKey: "CrimsonWitchOfFlames", slotKey: "sands", rarity: 5, level: 20, mainStatKey: "atk_", substats: [{ key: "critDMG_", value: 14 }] },
    { setKey: "CrimsonWitchOfFlames", slotKey: "goblet", rarity: 5, level: 20, mainStatKey: "pyro_dmg_", substats: [{ key: "critRate_", value: 7 }] },
    { setKey: "CrimsonWitchOfFlames", slotKey: "circlet", rarity: 5, level: 20, mainStatKey: "critDMG_", substats: [{ key: "critRate_", value: 10 }] },
  ],
});

test("optimize a build from an imported GOOD inventory", async ({ page }) => {
  await page.goto("/optimize");

  // 1 · import inventory (the /optimize chunk is lazy + heavy; wait for it before asserting the
  // import result, and allow extra time under parallel load on the single dev server)
  const goodInput = page.getByLabel("GOOD inventory JSON");
  await expect(goodInput).toBeVisible();
  await goodInput.fill(GOOD);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/Imported 5 artifacts/)).toBeVisible({ timeout: 15000 });

  // 2 · pick character; wait for its weapons to load
  // (exact — "Character" also substring-matches the "Owned characters only" checkbox added by E1)
  await page.getByLabel("Character", { exact: true }).selectOption("hu-tao");
  await expect(page.getByLabel("Weapon").locator("option", { hasText: "Staff of Homa" })).toBeAttached();

  // 3 · optimize → results
  await page.getByRole("button", { name: "Optimize", exact: true }).click();
  await expect(page.getByText("Best builds")).toBeVisible();
  const apply = page.getByRole("button", { name: "Apply" }).first();
  await expect(apply).toBeVisible();

  // 4 · apply → lands on the character page with a build code
  await apply.click();
  await expect(page).toHaveURL(/\/character\/hu-tao\?build=/);
});

// H — the imported inventory persists and shows on the Inventory page with Crit-Value grading.
test("inventory page grades imported artifacts by Crit Value", async ({ page }) => {
  await page.goto("/optimize");
  await page.getByLabel("GOOD inventory JSON").fill(GOOD);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/Imported 5 artifacts/)).toBeVisible({ timeout: 15000 });

  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Artifact inventory" })).toBeVisible();
  await expect(page.locator(".grid.wide > .card")).toHaveCount(5);
  // highest-CV first: the flower (CRIT Rate 7 → ×2 + CRIT DMG 14 = 28 CV).
  await expect(page.locator(".cv-badge").first()).toContainText("28 CV");
  // filter by slot
  await page.getByLabel("Filter by slot").selectOption("Circlet");
  await expect(page.locator(".grid.wide > .card")).toHaveCount(1);
});

// Batch 7 #3 — the optimizer used to score every candidate with `activeConditionals: []`, so it
// was blind to the 4pc effects players build around. Marechaussee Hunter's 4pc is +36% CRIT Rate.
const TWO_SETS = JSON.stringify({
  format: "GOOD",
  version: 2,
  artifacts: [
    // Crimson Witch rolls better on every piece...
    ...["flower", "plume", "sands", "goblet", "circlet"].map((slotKey, i) => ({
      setKey: "CrimsonWitchOfFlames",
      slotKey,
      rarity: 5,
      level: 20,
      mainStatKey: ["hp", "atk", "atk_", "pyro_dmg_", "critDMG_"][i],
      substats: [i % 2 === 0 ? { key: "critRate_", value: 12 } : { key: "critDMG_", value: 20 }],
    })),
    // ...but Marechaussee's 4pc conditional is worth more than the substat gap.
    ...["flower", "plume", "sands", "goblet", "circlet"].map((slotKey, i) => ({
      setKey: "MarechausseeHunter",
      slotKey,
      rarity: 5,
      level: 20,
      mainStatKey: ["hp", "atk", "atk_", "pyro_dmg_", "critDMG_"][i],
      substats: [i % 2 === 0 ? { key: "critRate_", value: 6 } : { key: "critDMG_", value: 12 }],
    })),
  ],
});

test("optimizer scores conditional buffs, and can be told not to", async ({ page }) => {
  await page.goto("/optimize");
  await page.getByLabel("GOOD inventory JSON").fill(TWO_SETS);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/Imported 10 artifacts/)).toBeVisible({ timeout: 15000 });

  await page.getByLabel("Character", { exact: true }).selectOption("hu-tao");
  await expect(page.getByLabel("Weapon").locator("option", { hasText: "Staff of Homa" })).toBeAttached();
  await page.getByLabel("Weapon").selectOption("staff-of-homa");

  const topResult = page.locator(".opt-results > li").first();
  const scoreOf = async () => {
    const text = await topResult.locator(".opt-result-head strong").innerText();
    return Number(text.replace(/[^\d.]/g, ""));
  };

  // On by default: the winning build names the 4pc buff it was scored with.
  await page.getByLabel("Count conditional buffs").isChecked();
  await page.getByRole("button", { name: "Optimize", exact: true }).click();
  await expect(page.getByText("Best builds")).toBeVisible();
  await expect(topResult.locator(".opt-result-buffs")).toContainText("Marechaussee Hunter");
  const withBuffs = await scoreOf();

  // Off: no buff line, and a strictly lower score from the same inventory.
  await page.getByLabel("Count conditional buffs").uncheck();
  await page.getByRole("button", { name: "Optimize", exact: true }).click();
  await expect(topResult.locator(".opt-result-buffs")).toHaveCount(0);
  expect(await scoreOf()).toBeLessThan(withBuffs);
});
