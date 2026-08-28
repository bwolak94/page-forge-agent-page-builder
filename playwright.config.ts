import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for PageForge e2e tests.
 *
 * E2e tests live in apps/web/e2e/ and require:
 *   - Running Next.js dev server (or production build)
 *   - Infrastructure from docker-compose.test.yml
 *   - FIXTURE_DOC_ID env var (tests skip gracefully if absent)
 *
 * Local run:
 *   docker compose -f docker-compose.test.yml up -d
 *   pnpm exec playwright test
 */
export default defineConfig({
  testDir: "./apps/web/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,

  reporter: process.env["CI"] ? "github" : "list",

  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm --filter web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env["DATABASE_URL"] ?? "postgresql://pageforge:pageforge@localhost:5433/pageforge_test",
      REDIS_HOST: process.env["REDIS_HOST"] ?? "localhost",
      REDIS_PORT: process.env["REDIS_PORT"] ?? "6380",
    },
  },
});
