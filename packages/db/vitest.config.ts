import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@pageforge/ir": path.resolve(root, "packages/ir/src/index.ts"),
      "@pageforge/commands": path.resolve(root, "packages/commands/src/index.ts"),
      "@pageforge/registry": path.resolve(root, "packages/registry/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**"],
    },
  },
});
