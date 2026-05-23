import { expect, test } from "@playwright/test"
import { sampleJobs } from "../fixtures/sample-jobs"
import { fillJobImport, seedReadyDashboardProfile } from "./helpers"

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("job import accepts valid fake job data", async ({ page }) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await fillJobImport(page, sampleJobs.highFitUkEuTech)

  await expect(page.getByLabel("Job title")).toHaveValue(
    sampleJobs.highFitUkEuTech.title
  )
  await expect(page.getByLabel("Company")).toHaveValue(
    sampleJobs.highFitUkEuTech.company
  )
  await expect(
    page.getByRole("button", { name: "Save EU fit result" })
  ).toBeEnabled()
})

test("empty job import blocks progress with disabled save action", async ({
  page
}) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("button", { name: "Save EU fit result" })
  ).toBeDisabled()
})
