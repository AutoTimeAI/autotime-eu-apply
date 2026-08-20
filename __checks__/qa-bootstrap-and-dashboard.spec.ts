import { expect, test } from "@playwright/test"

// Sign-in/bootstrap and dashboard access, run by Checkly. Requires
// QA_SESSION_URL to be set as a Checkly environment variable (via the
// Checkly dashboard or `checkly env add` - never committed here). See
// docs/quality-assurance.md.
test("QA session bootstraps and lands on the dashboard", async ({ page }) => {
  const qaSessionUrl = process.env.QA_SESSION_URL
  if (!qaSessionUrl) {
    throw new Error(
      "QA_SESSION_URL is not configured as a Checkly environment variable."
    )
  }

  const origin = new URL(qaSessionUrl).origin
  await page.goto(qaSessionUrl, { waitUntil: "domcontentloaded" })
  await page.waitForURL(`${origin}/dashboard`, { timeout: 20_000 })
  await expect(page.locator("main.home-experience")).toBeVisible()
})
