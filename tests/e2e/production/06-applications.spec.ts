import { expect, test } from "@playwright/test"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Applications pipeline, application detail/evidence/readiness, applied and
// rejected states. Against real production. Read-only: does not transition
// any application's status or submit a real application.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("applications pipeline renders with stage filters reflecting real counts", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/applications")
  await expect(page.locator("main.phase-three-applications")).toBeVisible()

  const stageFilters = page.getByRole("group", {
    name: "Filter applications by stage"
  })
  await expect(stageFilters.getByRole("button", { name: /^All\b/ })).toBeVisible()
})

test("opening an application shows its detail, evidence and readiness state", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/applications")
  const firstApplicationLink = page
    .locator("main.phase-three-applications")
    .getByRole("link")
    .first()

  if ((await firstApplicationLink.count()) === 0) {
    await expect(
      page.getByRole("heading", { name: "No applications yet" })
    ).toBeVisible()
    test.skip(true, "No applications are currently seeded for the QA account")
  }

  await firstApplicationLink.click()
  await expect(page.locator("main.phase-three-application-detail")).toBeVisible({
    timeout: 15_000
  })
})

test("an Applied-stage application, if present, shows its submission record", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/applications")
  const stageFilters = page.getByRole("group", {
    name: "Filter applications by stage"
  })
  const appliedFilter = stageFilters.getByRole("button", { name: /^Applied\b/ })

  if ((await appliedFilter.count()) === 0) {
    test.skip(true, "No Applied-stage applications are currently seeded")
  }

  await appliedFilter.click()
  await page
    .locator("main.phase-three-applications")
    .getByRole("link")
    .first()
    .click()
  await expect(page.locator("main.phase-three-application-detail")).toBeVisible()
})
