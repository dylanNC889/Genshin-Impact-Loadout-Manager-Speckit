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

  // 1 · import inventory
  await page.getByLabel("GOOD inventory JSON").fill(GOOD);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText(/Imported 5 artifacts/)).toBeVisible();

  // 2 · pick character; wait for its weapons to load
  await page.getByLabel("Character").selectOption("hu-tao");
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
