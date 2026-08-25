import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Evals are long-running (LLM calls) — generous timeout
    testTimeout: 120_000,
    hookTimeout: 30_000,
    // Sequential to avoid rate-limit spikes
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    include: ["runner/**/*.eval.ts"],
    reporters: ["verbose"],
  },
});
