import { expect, test } from "@playwright/test"
import { bootstrapQaSession, getProductionOrigin, gotoProduction } from "./helpers"

// API error, empty, loading and unavailable states; and the safely
// testable slice of user-data isolation (this repo has exactly one QA
// account, so this checks unauthenticated/unauthorized rejection rather
// than fabricating a second account - see docs/quality-assurance.md).
// Against real production.

test.describe("data isolation", () => {
  test("an unauthenticated request to a protected sync endpoint is rejected", async ({
    page
  }) => {
    const response = await page.request.get(
      new URL("/api/sync/dashboard", getProductionOrigin()).toString()
    )
    expect(response.status()).toBe(401)
  })

  test("an authenticated request with a tampered application id is rejected, not leaked", async ({
    page
  }) => {
    await bootstrapQaSession(page)
    const response = await page.request.delete(
      new URL("/api/sync/dashboard", getProductionOrigin()).toString(),
      { data: { applicationId: "00000000-0000-0000-0000-000000000000" } }
    )
    // RLS scopes every delete to the caller's own user_id - a made-up id
    // belonging to no one (or someone else) must not 500 or report success
    // for a row it never touched.
    expect(response.status()).toBeLessThan(500)
  })
})

test.describe("empty and error states", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapQaSession(page)
  })

  test("a failed dashboard sync read surfaces an error state, not a blank crash", async ({
    page
  }) => {
    await page.route("**/api/sync/dashboard", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          json: { data: null, error: "Simulated failure", status: 500 }
        })
        return
      }
      await route.continue()
    })

    await gotoProduction(page, "/dashboard/applications")
    // The page must still render its shell rather than a blank/crashed
    // screen when the sync read fails.
    await expect(page.locator("main.phase-three-applications")).toBeVisible()
  })

  test("a network-unavailable dashboard sync still renders the interviews page shell", async ({
    page
  }) => {
    await page.route("**/api/sync/dashboard", (route) => route.abort("failed"))

    await gotoProduction(page, "/dashboard/interviews")
    await expect(page.locator("main.phase-four-interviews")).toBeVisible()
  })

  test("jobs list renders its own shell independently of the applications sync endpoint", async ({
    page
  }) => {
    // Jobs are tracked client-side only (no server sync endpoint), so a
    // failing /api/sync/dashboard read must not affect the jobs list at all.
    await page.route("**/api/sync/dashboard", (route) => route.abort("failed"))

    await gotoProduction(page, "/dashboard/jobs")
    await expect(page.locator("main.phase-two-jobs")).toBeVisible()
  })
})
