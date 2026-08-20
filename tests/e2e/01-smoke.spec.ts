import { expect, test } from "@playwright/test"
import { expectNoSeriousViolations } from "./helpers/axe"

test("homepage loads and shows the main CTA", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: "EU Apply" })).toBeVisible()
  await expect(
    page.getByText("Private Beta v1 - founder-led early access")
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /Start free|Open dashboard/ })
  ).toBeVisible()
  await expectNoSeriousViolations(page)
})
