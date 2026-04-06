import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "src/middleware/**/*.ts",
        "src/routes/**/*.ts",
        "src/services/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/index.ts",
      ],
    },
  },
});
