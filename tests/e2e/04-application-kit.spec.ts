import { expect, test } from "@playwright/test"
import { sampleJobs } from "../fixtures/sample-jobs"
import {
  fillJobImport,
  saveFitResultAsTrackedJob,
  seedReadyDashboardProfile
} from "./helpers"

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("application kit generates after EU fit is saved", async ({ page }) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await fillJobImport(page, sampleJobs.highFitUkEuTech)
  await saveFitResultAsTrackedJob(page)
  await page.goto("/dashboard/application-answers", {
    waitUntil: "domcontentloaded"
  })

  await expect(
    page.getByRole("heading", { name: "Write for one tracked job" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Generate application kit" }).click()
  await expect(page.getByRole("heading", { name: "Profile summary" })).toBeVisible()
  await expect(page.getByText(/no job guarantee/i)).toBeVisible()
})
