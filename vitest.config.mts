import { defineConfig } from "vitest/config";

// Minimal config for T-10: only the pure domain unit tests run through this today.
// Integration tests (T-12+) will extend this, not replace it.
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
  },
});
