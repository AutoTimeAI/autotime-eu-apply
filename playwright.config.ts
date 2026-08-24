import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isExternalBaseUrl = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(
  baseURL,
);

export default defineConfig({
  testDir: "./tests/e2e",
  // Production verification has its own explicit config/command. Keeping it
  // out of the default suite prevents ordinary local QA from making network
  // requests to production or treating missing production credentials as a
  // local regression.
  testIgnore: ["production/**"],
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isExternalBaseUrl
    ? undefined
    : {
        // Run Next directly so Playwright owns the actual server process.
        // A pnpm intermediary left the Next child alive on Windows after all
        // assertions completed, preventing the command from exiting cleanly.
        command: "node apps/web/node_modules/next/dist/bin/next dev apps/web",
        env: {
          AUTOTIME_TEST_AUTH_ENABLED: "true",
          AUTOTIME_TEST_USER_EMAIL: "test.user@example.com",
          AUTOTIME_TEST_USER_PLAN: "pro",
          NEXT_PUBLIC_APP_ENV: "development",
          NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED: "false",
          NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY: "true",
          NEXT_PUBLIC_AUTOTIME_ENV: "development",
          NEXT_PUBLIC_SENTRY_DSN: "",
          // Inert public fixtures keep auth controls renderable without any
          // network-backed Supabase project or production credentials.
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline-ci-anon-key",
        },
        reuseExistingServer: false,
        timeout: 120_000,
        url: baseURL,
      },
});
