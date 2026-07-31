import { defineConfig } from "vitest/config";
import path from "node:path";

// Mirrors the "@/*" -> "src/*" mapping in tsconfig.json. No test config
// previously existed in this repo (tests/ only had .gitkeep files) —
// this is the minimal setup needed to run the Phase 3 auth unit tests.
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
