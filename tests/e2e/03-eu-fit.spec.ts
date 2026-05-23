import { expect, test } from "@playwright/test"
import { sampleJobs } from "../fixtures/sample-jobs"
import { fillJobImport, seedReadyDashboardProfile } from "./helpers"

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("EU fit cannot run before job import", async ({ page }) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("button", { name: "Check EU fit" })
  ).toBeDisabled()
})

test("EU fit result is visible after job import", async ({ page }) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await fillJobImport(page, sampleJobs.highFitUkEuTech)

  await expect(
    page.getByRole("heading", { name: "Evidence-led role decision" })
  ).toBeVisible()
  await expect(page.getByText(/confidence/i)).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Save EU fit result" })
  ).toBeEnabled()
})
