import { expect, test } from "@playwright/test"
import { fillJobImport, seedReadyDashboardProfile } from "./helpers"

const linkedInJob = {
  title: "Application Support Specialist (L2/L3)",
  company: "SOFYNE",
  url: "https://www.linkedin.com/jobs/view/4390984648/",
  description:
    "Role: Application Support Specialist (L2/L3)\nCompany: SOFYNE\nLocation: London, England, United Kingdom\n\nPlatform: LinkedIn\nSource: linkedin.com\nSupport regulated banking applications, triage incidents and coordinate fixes with engineering."
}

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("a pasted LinkedIn vacancy reflects in the Jobs list within seconds", async ({
  page
}) => {
  await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" })

  const startedAt = Date.now()
  await fillJobImport(page, linkedInJob)

  await expect(
    page.getByRole("heading", { name: linkedInJob.title })
  ).toBeVisible()
  await expect(
    page.getByText(linkedInJob.company, { exact: false })
  ).toBeVisible()

  expect(Date.now() - startedAt).toBeLessThanOrEqual(5_000)

  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { name: linkedInJob.title })
  ).toBeVisible()
})
