import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Boots the backend + frontend on DEDICATED ports (not the dev defaults 3000/5173)
 * so the suite never collides with a dev server — or another app — already running locally.
 * The frontend proxies /api to the test backend via VITE_PROXY_TARGET.
 * Run with: pnpm --filter @app/frontend test:e2e
 */
const BACKEND_PORT = 3100;
const FRONTEND_PORT = 5199;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Reset the isolated E2E store before the run (keeps tests off the dev server's data).
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @app/backend start",
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      cwd: "..",
      // Dedicated store so E2E never pollutes (or reads) the dev server's .data/store.json.
      env: { PORT: String(BACKEND_PORT), STORE_PATH: ".data/e2e-store.json" },
    },
    {
      command: `pnpm exec vite --port ${FRONTEND_PORT} --strictPort`,
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
