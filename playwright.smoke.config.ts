import { defineConfig, devices } from "@playwright/test";

const smokePort = process.env.SMOKE_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${smokePort}`;
const projects = process.env.AUTOTIME_CROSS_BROWSER === "true"
  ? [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ]
  : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }];

export default defineConfig({
  testDir: "./tests/smoke",
  outputDir: "artifacts/playwright/smoke/test-results",
  globalTeardown: "./scripts/playwright-global-teardown.mjs",
  fullyParallel: false,
  timeout: 45_000,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "artifacts/playwright/smoke/report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects,
  webServer: {
    command: `node scripts/playwright-web-server.mjs ${smokePort}`,
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
