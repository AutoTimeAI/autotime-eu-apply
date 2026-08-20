import { expect, test, type Page } from "@playwright/test"
import { seedReadyDashboardProfile } from "../helpers"

// Visual regression baselines using Playwright's built-in screenshot
// comparison (not a separate service like Percy - see docs/quality-assurance.md
// for how to review/update baselines). Scoped to a small, deterministic set
// of principal desktop and mobile states: the two public pages plus the
// dashboard's empty/fresh states, which need no complex fixture data and
// stay stable across seed-data changes elsewhere in the suite.

const desktop = { width: 1440, height: 900 }
const mobile = { width: 390, height: 844 }

// Add a `mask: [page.locator(...)]` entry per-test if a state under test
// gains genuinely dynamic content (relative timestamps, avatars) - none of
// the states covered here currently render any.
const screenshotOptions = { animations: "disabled" as const }

async function disableDevelopmentToolbar(page: Page) {
  await page.request
    .post("http://127.0.0.1:3000/__nextjs_devtools_config", {
      data: { disableDevIndicator: true }
    })
    .catch(() => undefined)
}

for (const [name, viewport] of [
  ["desktop", desktop],
  ["mobile", mobile]
] as const) {
  test.describe(`${name} viewport`, () => {
    test.use({ viewport })

    test("landing page", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await page.goto("/", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page).toHaveScreenshot(`landing-${name}.png`, screenshotOptions)
    })

    test("login page", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await page.goto("/login", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page).toHaveScreenshot(`login-${name}.png`, screenshotOptions)
    })

    test("dashboard home, fresh profile", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await seedReadyDashboardProfile(page)
      await page.goto("/dashboard", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page).toHaveScreenshot(`dashboard-home-${name}.png`, screenshotOptions)
    })

    test("jobs list, empty state", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await seedReadyDashboardProfile(page)
      await page.goto("/dashboard/jobs", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page.locator("main.phase-two-jobs")).toHaveScreenshot(
        `jobs-empty-${name}.png`,
        screenshotOptions
      )
    })

    test("applications pipeline, empty state", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await seedReadyDashboardProfile(page)
      await page.goto("/dashboard/applications", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page.locator("main.phase-three-applications")).toHaveScreenshot(
        `applications-empty-${name}.png`,
        screenshotOptions
      )
    })

    test("interviews, empty state", async ({ page }) => {
      await disableDevelopmentToolbar(page)
      await seedReadyDashboardProfile(page)
      await page.goto("/dashboard/interviews", { waitUntil: "networkidle" })
      await page.mouse.move(0, 0)
      await expect(page.locator("main.phase-four-interviews")).toHaveScreenshot(
        `interviews-empty-${name}.png`,
        screenshotOptions
      )
    })
  })
}
