import { defineConfig, devices } from "@playwright/test";

const smokePort = process.env.SMOKE_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${smokePort}`;

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  timeout: 15_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter web exec next dev --hostname 127.0.0.1 --port ${smokePort}`,
    env: {
      AUTOTIME_TEST_AUTH_ENABLED: "true",
      AUTOTIME_TEST_USER_EMAIL: "smoke.user@example.com",
      AUTOTIME_TEST_USER_PLAN: "pro",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED: "false",
      NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY: "true",
      NEXT_PUBLIC_AUTOTIME_ENV: "development",
      NEXT_PUBLIC_SENTRY_DSN: "",
    },
    reuseExistingServer: process.env.SMOKE_REUSE_SERVER === "true",
    timeout: 120_000,
    url: baseURL,
  },
});
