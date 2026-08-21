import { expect, test } from "@playwright/test"
import { bootstrapQaSession, getProductionOrigin, gotoProduction } from "./helpers"

// QA authentication and dashboard access, unauthenticated access/redirects,
// and sign-out - against real production, using the dedicated QA test
// account (docs/qa-test-account.md). Read-mostly: no AI generation is
// triggered here (that would incur real, metered OpenAI cost on every CI
// run - see docs/quality-assurance.md for the scoping rationale).

test.describe("unauthenticated access", () => {
  test("protected dashboard routes redirect an unauthenticated visitor to login", async ({
    page
  }) => {
    await gotoProduction(page, "/dashboard")
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByRole("heading", { name: "Open your dashboard" })
    ).toBeVisible()
  })

  test("the QA session-bootstrap route rejects a request with no or an invalid secret", async ({
    page
  }) => {
    const response = await page.request.get(
      new URL(
        "/api/qa/session?secret=not-a-real-secret",
        getProductionOrigin()
      ).toString(),
      { maxRedirects: 0 }
    )
    // The route is documented to 404 on any secret mismatch, never
    // revealing whether QA bootstrap is even configured.
    expect(response.status()).toBe(404)
  })
})

test.describe("QA authentication and dashboard access", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapQaSession(page)
  })

  test("bootstrapping lands on the dashboard as the QA account", async ({
    page
  }) => {
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator("main.home-experience")).toBeVisible()
  })

  test("session persists across a fresh navigation to a protected route", async ({
    page
  }) => {
    await gotoProduction(page, "/dashboard/profile")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator("main.profile-page")).toBeVisible()
  })
})

test.describe("sign-out", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapQaSession(page)
  })

  test("signing out returns the account to the unauthenticated state", async ({
    page
  }) => {
    await gotoProduction(page, "/dashboard/profile")
    await expect(page.locator("main.profile-page")).toBeVisible()
    await page.waitForLoadState("networkidle")
    await page.locator(".user-nav-trigger").click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 15_000 })

    await gotoProduction(page, "/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })
})
