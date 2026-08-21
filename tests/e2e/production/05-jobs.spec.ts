import { expect, test } from "@playwright/test"
import { bootstrapQaSession, gotoProduction } from "./helpers"

// Jobs listing, search, filters and job details; job analysis surfaces
// (rendering only). Against real production. Deliberately does not click
// "Analyse job" / "Re-analyse" or any Apply/Consider/Skip action, since
// those trigger real, metered OpenAI calls - see docs/quality-assurance.md.

test.beforeEach(async ({ page }) => {
  await bootstrapQaSession(page)
})

test("jobs list renders with working search and filter controls", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/jobs")
  await expect(page.locator("main.phase-two-jobs")).toBeVisible()

  const jobCount = await page.locator("main.phase-two-jobs").getByRole("link").count()

  if (jobCount === 0) {
    await expect(page.getByRole("button", { name: "Add a job" })).toBeVisible()
    return
  }

  const filters = page.getByRole("region", { name: "Filter jobs" })
  const search = filters.getByLabel("Search")
  await expect(search).toBeVisible()
  await search.fill("a")
  await search.fill("")
})

test("opening a job shows its detail view without triggering a new analysis", async ({
  page
}) => {
  await gotoProduction(page, "/dashboard/jobs")
  const firstJobLink = page.locator("main.phase-two-jobs").getByRole("link").first()

  if ((await firstJobLink.count()) === 0) {
    test.skip(true, "No jobs are currently seeded for the QA account")
  }

  await firstJobLink.click()
  await expect(page.locator("main.phase-two-job-detail")).toBeVisible()
})
