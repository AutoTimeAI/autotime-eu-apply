import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const isExternalBaseUrl = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(
  baseURL
)

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "artifacts/playwright/full/test-results",
  globalTeardown: "./scripts/playwright-global-teardown.mjs",
  fullyParallel: false,
  // Cold route compilation under the disk-safe webpack runner can add tens of
  // seconds to an otherwise healthy multi-page journey.
  timeout: 120_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "artifacts/playwright/full/report" }]],
  expect: {
    // Hydrated UI assertions should tolerate cold webpack route compilation;
    // the overall test timeout still catches genuinely stalled journeys.
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: isExternalBaseUrl
    ? undefined
    : {
        command: "node scripts/playwright-web-server.mjs 3000 webpack",
        env: {
          AUTOTIME_TEST_AUTH_ENABLED: "true",
          AUTOTIME_TEST_USER_EMAIL: "test.user@example.com",
          AUTOTIME_TEST_USER_PLAN: "pro",
          NEXT_PUBLIC_APP_ENV: "development",
          NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED: "false",
          NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY: "true",
          NEXT_PUBLIC_AUTOTIME_ENV: "development",
          NEXT_PUBLIC_SENTRY_DSN: ""
        },
        reuseExistingServer: false,
        timeout: 120_000,
        url: baseURL
      }
})
