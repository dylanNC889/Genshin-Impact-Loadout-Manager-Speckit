import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Boots the backend + frontend on DEDICATED ports (not the dev defaults 3000/5173)
 * so the suite never collides with a dev server — or another app — already running locally.
 * Run with: pnpm --filter @app/frontend test:e2e
 *
 * Two reliability decisions worth knowing about:
 *
 * 1. The frontend serves a PRODUCTION BUILD via `vite preview`, not the dev server. A dev
 *    server compiles modules on demand, so the first browser to request a heavy lazy route
 *    (/optimize, /character) pays the transform cost — and under full parallelism a dozen
 *    workers queue behind it and blow their timeouts. The build takes ~1s and makes the run
 *    both faster and deterministic.
 *
 * 2. Readiness is checked with an APP-SPECIFIC url, not a bare port. Playwright's `port:`
 *    check only proves *something* is listening, and `reuseExistingServer` will then happily
 *    adopt it — an unrelated local app squatting on the port silently 404s every /api call
 *    and the whole suite fails in a way that looks like a code regression. Pointing the check
 *    at /api/v1/characters means a foreign server fails readiness, so Playwright tries to
 *    start ours and reports a loud "port in use" instead. Both ports are overridable for
 *    exactly that case:
 *      E2E_BACKEND_PORT=3299 E2E_FRONTEND_PORT=5299 pnpm --filter @app/frontend test:e2e
 */
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 3199);
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 5199);

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
      // Wipe the isolated store *before* the backend boots (globalSetup races the server
      // startup — the backend can load the old file into memory before the wipe lands).
      command: "rm -f backend/.data/e2e-store.json && pnpm --filter @app/backend start",
      // An app-specific route, so a foreign server on this port can't pass as ours.
      url: `http://localhost:${BACKEND_PORT}/api/v1/characters`,
      reuseExistingServer: !process.env.CI,
      cwd: "..",
      // Dedicated store so E2E never pollutes (or reads) the dev server's .data/store.json.
      env: { PORT: String(BACKEND_PORT), STORE_PATH: ".data/e2e-store.json" },
    },
    {
      // Always rebuild: a stale `dist/` reused from an earlier run would silently test the
      // wrong code. `vite build` is ~1s, so this costs nothing worth optimising away.
      command: `pnpm exec vite build && pnpm exec vite preview --port ${FRONTEND_PORT} --strictPort`,
      // Proxied through the preview server, so this one check proves the frontend is up AND
      // that its /api proxy actually reaches our backend.
      url: `http://localhost:${FRONTEND_PORT}/api/v1/characters`,
      reuseExistingServer: false,
      env: { VITE_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
