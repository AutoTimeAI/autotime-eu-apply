// Verifies the /sentry-test diagnostic page (used to manually trigger a
// Sentry error for pipeline verification) is only reachable in non-production
// environments. Guards against accidentally shipping a public
// error-throwing debug page to real users.
import { expect, test } from "@playwright/test"

test("sentry test page is unavailable in production smoke targets", async ({
  baseURL,
  page
}) => {
  const isProductionTarget =
    process.env.NEXT_PUBLIC_APP_ENV === "production" ||
    process.env.NEXT_PUBLIC_AUTOTIME_ENV === "production" ||
    Boolean(baseURL && !/127\.0\.0\.1|localhost/i.test(baseURL))

  await page.goto("/sentry-test", { waitUntil: "domcontentloaded" })

  if (isProductionTarget) {
    await expect(
      page.getByRole("heading", { name: "Sentry test page" })
    ).toHaveCount(0)
    return
  }

  await expect(
    page.getByRole("heading", { name: "Sentry test page" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Throw Sentry test error" })
  ).toBeVisible()
})
