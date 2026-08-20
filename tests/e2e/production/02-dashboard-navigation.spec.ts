import { expect, test } from "@playwright/test"
import { bootstrapQaSession } from "./helpers"

// Dashboard navigation, plus mobile and desktop layouts, against real
// production. The nav link set mirrors what tests/e2e/22-phase-1-home-visual.spec.ts
// already asserts against the local-fixture build (Home, Jobs, Applications,
// Interviews always visible; Career Direction, Countries, Profile inline on
// desktop, behind a "more" menu on mobile).

const primaryLinks = ["Home", "Jobs", "Applications", "Interviews"]
const secondaryLinks = ["Career Direction", "Countries", "Profile"]

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test.describe("desktop layout", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("every primary journey is reachable from the dashboard nav", async ({
    page
  }) => {
    const nav = page.locator(".dashboard-workflow-nav")
    for (const name of [...primaryLinks, ...secondaryLinks]) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible()
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
  })

  test("clicking Jobs, Applications and Interviews navigates to each workflow page", async ({
    page
  }) => {
    const nav = page.locator(".dashboard-workflow-nav")

    await nav.getByRole("link", { name: "Jobs", exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/jobs/)
    await expect(page.locator("main.phase-two-jobs")).toBeVisible()

    await nav.getByRole("link", { name: "Applications", exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/applications/)
    await expect(page.locator("main.phase-three-applications")).toBeVisible()

    await nav.getByRole("link", { name: "Interviews", exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/interviews/)
    await expect(page.locator("main.phase-four-interviews")).toBeVisible()
  })
})

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("primary links are visible and secondary links are reachable via the more menu", async ({
    page
  }) => {
    const nav = page.locator(".mobile-workflow-nav")
    for (const name of primaryLinks) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible()
    }

    const more = nav.locator(".mobile-more-menu")
    await more.locator("summary").click()
    for (const name of secondaryLinks) {
      await expect(more.getByRole("link", { name, exact: true })).toBeVisible()
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
  })
})
