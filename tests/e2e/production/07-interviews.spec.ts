import { expect, test } from "@playwright/test"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Interviews, against real production. Read-only: does not generate a new
// interview prep pack (AI-backed) or record a practice answer.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("interviews list renders", async ({ page }) => {
  await gotoProduction(page, "/dashboard/interviews")
  await expect(page.locator("main.phase-four-interviews")).toBeVisible()
})

test("opening an interview shows its detail view", async ({ page }) => {
  await gotoProduction(page, "/dashboard/interviews")
  const firstInterviewLink = page
    .locator("main.phase-four-interview-list")
    .getByRole("link")
    .first()

  if ((await firstInterviewLink.count()) === 0) {
    await expect(
      page.getByRole("heading", { name: "No interviews recorded" })
    ).toBeVisible()
    test.skip(true, "No interviews are currently seeded for the QA account")
  }

  await firstInterviewLink.click()
  await expect(page.locator("main.phase-four-interview-detail")).toBeVisible({
    timeout: 15_000
  })
})
