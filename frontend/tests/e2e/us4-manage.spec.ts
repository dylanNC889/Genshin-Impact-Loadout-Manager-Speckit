import { test, expect } from "@playwright/test";

// US4 — save a loadout, see it on the Saved page, then delete it (FR-017/018/019/020).
test("save a loadout and manage it", async ({ page }) => {
  await page.goto("/character/diluc");
  await page.getByLabel("Loadout name").fill("Diluc E2E");
  await page.getByRole("button", { name: "Save loadout" }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible();

  await page.goto("/saved");
  const row = page.locator(".saved-list li", { hasText: "Diluc E2E" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "delete" }).click();
  await expect(page.locator(".saved-list li", { hasText: "Diluc E2E" })).toHaveCount(0);
});

// B2 — the compare page is reachable from the nav with two loadout pickers.
test("compare page with loadout pickers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Compare" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole("heading", { name: "Compare builds" })).toBeVisible();
  await expect(page.getByLabel("Loadout A")).toBeVisible();
  await expect(page.getByLabel("Loadout B")).toBeVisible();
});
