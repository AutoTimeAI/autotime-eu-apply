import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const isExternalBaseUrl = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(
  baseURL
)

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
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
        command: "pnpm dev:web",
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
