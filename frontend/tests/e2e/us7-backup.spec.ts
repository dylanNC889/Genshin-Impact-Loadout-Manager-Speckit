import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";

// B6 — export all saved data to JSON and import it back.
test("export and import saved data round-trips", async ({ page }) => {
  await page.goto("/character/diluc");
  await page.getByLabel("Loadout name").fill("Backup Diluc");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/saved");

  // Export → the downloaded JSON contains the loadout.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export data" }).click(),
  ]);
  const path = await download.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup.format).toBe("glm-backup");
  expect(backup.loadouts.some((l: { name: string }) => l.name === "Backup Diluc")).toBe(true);

  // Delete it, then re-import from the file → it comes back.
  const rows = page.locator(".saved-list li", { hasText: "Backup Diluc" });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }

  await page.getByLabel("Import backup file").setInputFiles(path);
  await expect(page.getByText(/Imported \d+ loadouts/)).toBeVisible();
  await expect(page.locator(".saved-list li", { hasText: "Backup Diluc" }).first()).toBeVisible();

  // Cleanup.
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: "delete" }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});
