import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Scope to only the files backed by actual unit tests
      include: [
        "server/utils/jobQueue.ts",
      ],
      exclude: [],
      thresholds: {
        // jobQueue.ts is well-covered by unit tests
        "server/utils/jobQueue.ts": {
          lines:     70,
          functions: 60,
          branches:  60,
          statements:70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
});
