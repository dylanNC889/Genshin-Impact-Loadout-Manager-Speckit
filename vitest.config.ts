import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // frontend/tests/unit covers the pure modules under frontend/src (team buffs, team damage).
    // They hold real logic, import no React, and were previously reachable only through E2E.
    include: [
      "packages/**/tests/**/*.test.ts",
      "backend/tests/**/*.test.ts",
      "frontend/tests/unit/**/*.test.ts",
    ],
    environment: "node",
  },
});
