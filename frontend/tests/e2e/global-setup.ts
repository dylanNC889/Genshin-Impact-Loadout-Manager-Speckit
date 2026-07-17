import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Start every E2E run from a clean, isolated store so tests never accumulate — or touch the
 *  dev server's saved data. Matches STORE_PATH in playwright.config.ts. */
export default function globalSetup(): void {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  rmSync(join(repoRoot, "backend", ".data", "e2e-store.json"), { force: true });
}
