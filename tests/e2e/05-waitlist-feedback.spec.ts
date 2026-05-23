import { expect, test } from "@playwright/test"
import { seedReadyDashboardProfile } from "./helpers"

test.beforeEach(async ({ page }) => {
  await seedReadyDashboardProfile(page)
})

test("waitlist and feedback actions are simple and safe", async ({ page }) => {
  await page.goto("/dashboard#mvp-feedback", { waitUntil: "domcontentloaded" })

  await expect(
    page.getByRole("heading", { name: "Join waitlist or leave feedback" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Join waitlist", exact: true })
  ).toHaveAttribute("href", /mailto:support@autotime\.ai/)
  await expect(
    page.getByRole("link", { name: "Leave feedback", exact: true })
  ).toHaveAttribute("href", /mailto:support@autotime\.ai/)
  await expect(page.getByText(/does not guarantee a job/i)).toBeVisible()
})
