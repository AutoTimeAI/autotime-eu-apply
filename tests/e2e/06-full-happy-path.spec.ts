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

test("full private beta flow completes without visible crash", async ({
  page
}) => {
  await page.goto("/dashboard/match-score", { waitUntil: "domcontentloaded" })

  await fillJobImport(page, sampleJobs.highFitUkEuTech)
  await expect(
    page.getByRole("heading", { name: "Evidence-led role decision" })
  ).toBeVisible()

  await saveFitResultAsTrackedJob(page)
  await expect(
    page.getByRole("heading", { level: 1, name: "Tracked Jobs" })
  ).toBeVisible()
  await expect(page.getByText("No tracked jobs yet")).toHaveCount(0)

  await page.goto("/dashboard/application-answers", {
    waitUntil: "domcontentloaded"
  })
  await page.getByRole("button", { name: "Generate application kit" }).click()
  await expect(page.getByRole("heading", { name: "Cover note" })).toBeVisible()

  await page.goto("/dashboard#mvp-feedback", { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("link", { name: "Join waitlist", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Leave feedback", exact: true })
  ).toBeVisible()
  await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0)
})
