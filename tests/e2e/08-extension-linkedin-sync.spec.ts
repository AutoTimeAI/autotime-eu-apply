import { expect, test } from "@playwright/test"
import {
  dashboardStorageKey,
  seedReadyDashboardProfile
} from "./helpers"

const syncedLinkedInApplication = {
  id: "linkedin-application-support-4390984648",
  title: "Application Support Specialist (L2/L3)",
  roleTitle: "Application Support Specialist (L2/L3)",
  company: "SOFYNE",
  url: "https://www.linkedin.com/jobs/view/4390984648/",
  source: "linkedin.com",
  createdAt: "2026-05-24T08:00:00.000Z",
  status: "Saved",
  notes:
    "Location: London, England, United Kingdom\n\nPlatform: LinkedIn\nSource: linkedin.com\nPage title: Application Support Specialist (L2/L3) | SOFYNE | LinkedIn"
}

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("extension-synced LinkedIn job reflects in dashboard within seconds", async ({
  page
}) => {
  await page.addInitScript(
    ({ application, key }) => {
      const stored = window.localStorage.getItem(key)
      const state = stored ? JSON.parse(stored) : {}

      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...state,
          applications: [
            application,
            ...(state.applications ?? []).filter(
              (item: { id?: string }) => item.id !== application.id
            )
          ]
        })
      )
    },
    {
      application: syncedLinkedInApplication,
      key: dashboardStorageKey
    }
  )

  const startedAt = Date.now()

  await page.goto("/dashboard/applications", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("heading", { level: 1, name: "Tracked Jobs" })
  ).toBeVisible()
  await expect(
    page.getByText("Application Support Specialist (L2/L3)")
  ).toBeVisible()
  await expect(page.getByText("SOFYNE")).toBeVisible()
  await expect(page.getByText("linkedin.com", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("textbox", { name: "Outcome learning" })
  ).toHaveValue(/London, England, United Kingdom/)
  await expect(page.getByText("No tracked jobs yet")).toHaveCount(0)

  expect(Date.now() - startedAt).toBeLessThanOrEqual(5_000)

  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(
    page.getByText("Application Support Specialist (L2/L3)")
  ).toBeVisible()
})
