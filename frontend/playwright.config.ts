import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (deferred — requires a browser, not available in the current dev environment).
 * Boots the backend + frontend, then runs the user-story journeys in tests/e2e against the
 * live app. Run with: pnpm --filter @app/frontend test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @app/backend start",
      port: 3000,
      reuseExistingServer: true,
      cwd: "..",
    },
    {
      command: "pnpm dev",
      port: 5173,
      reuseExistingServer: true,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
