import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/tests/**/*.test.ts", "backend/tests/**/*.test.ts"],
    environment: "node",
  },
});
