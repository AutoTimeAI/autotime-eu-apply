import { expect, test } from "@playwright/test"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Career Direction / Role Pathways, against real production. Read-only:
// does not trigger pathway generation (an AI-backed action) or submit lane
// selections.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("Career Direction page renders", async ({ page }) => {
  await gotoProduction(page, "/dashboard/role-pathways")
  await expect(page.getByRole("heading", { name: "Role Pathways" })).toBeVisible()
  await expect(page.locator("main.phase-six-career-direction")).toBeVisible()
})
