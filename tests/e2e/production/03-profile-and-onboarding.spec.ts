import { expect, test } from "@playwright/test"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Profile and onboarding, against real production. Read-only: the QA
// account's onboarding is already complete (docs/qa-test-account.md), so
// this verifies the completed-profile view renders and that the onboarding
// gate correctly redirects a completed account away from the wizard,
// without submitting any profile edits.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("profile page renders the completed profile for the QA account", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/profile")
  await expect(page.locator("main.profile-page")).toBeVisible()
})

test("visiting the onboarding wizard with a completed profile redirects away from it", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/onboarding")
  await expect(page.locator("main.onboarding-wizard-shell")).toHaveCount(0)
})
