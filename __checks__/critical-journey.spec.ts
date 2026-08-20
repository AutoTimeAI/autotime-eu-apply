import { expect, test } from "@playwright/test"

// One critical, read-only user journey: sign in as the QA account and open
// the applications pipeline. Requires QA_SESSION_URL as a Checkly
// environment variable - see docs/quality-assurance.md. Deliberately does
// not click into any action that mutates data or triggers an AI call.
test("QA account can reach the applications pipeline", async ({ page }) => {
  const qaSessionUrl = process.env.QA_SESSION_URL
  if (!qaSessionUrl) {
    throw new Error(
      "QA_SESSION_URL is not configured as a Checkly environment variable."
    )
  }

  const origin = new URL(qaSessionUrl).origin
  await page.goto(qaSessionUrl, { waitUntil: "domcontentloaded" })
  await page.waitForURL(`${origin}/dashboard`, { timeout: 20_000 })

  await page.goto(`${origin}/dashboard/applications`, {
    waitUntil: "domcontentloaded"
  })
  await expect(page.locator("main.phase-three-applications")).toBeVisible()
})
