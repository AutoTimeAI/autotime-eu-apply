import { expect, test } from "@playwright/test"
import { expectNoSeriousViolations } from "../helpers/axe"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Countries / International module, including the three fully-supported
// journeys (Ireland, Germany, Netherlands) and one unsupported-country
// explorer-mode example (Belgium) - see apps/web/components/international/model.ts.
// Against real production, read-only.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("International applications overview renders", async ({ page }) => {
  await gotoProduction(page, "/dashboard/international")
  await expect(
    page.getByRole("heading", { name: "International applications" })
  ).toBeVisible()
  await expect(page.locator("main.phase-five-countries")).toBeVisible()
  await expectNoSeriousViolations(page, { include: "main.phase-five-countries" })
})

for (const country of ["Ireland", "Germany", "Netherlands"]) {
  test(`${country} shows full pathway intelligence`, async ({ page }) => {
    await gotoProduction(page, "/dashboard/international")
    await page.getByRole("button", { name: "Country workspace" }).click()
    await page.getByLabel("Hiring country").selectOption(country)
    await expect(page.getByRole("heading", { name: country, level: 2 })).toBeVisible()
    await expect(page.getByText("Full pathway intelligence")).toBeVisible()
  })
}

test("an unsupported country (Belgium) renders in limited explorer mode", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/international")
  await page.getByRole("button", { name: "Country workspace" }).click()
  await page.getByLabel("Hiring country").selectOption("Belgium")
  await expect(page.getByRole("heading", { name: "Belgium", level: 2 })).toBeVisible()
  await expect(
    page.getByText("Limited coverage — verification required", { exact: true })
  ).toBeVisible()
})
