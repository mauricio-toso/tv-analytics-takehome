import { defineConfig } from "vitest/config";

// Extended for T-12: integration tests need the seeded Postgres connection env
// (server/test-setup.ts loads .env the same way server/index.ts does).
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    setupFiles: ["./server/test-setup.ts"],
  },
});
