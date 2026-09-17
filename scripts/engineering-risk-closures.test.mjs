import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const read = (path) => readFileSync(join(process.cwd(), path), "utf8")

test("account deletion cascades through evidence, outcomes, and interview preparation data", () => {
  const migration = read(
    "supabase/migrations/20260509130000_dashboard_workflow_tables.sql",
  )

  for (const table of [
    "evidence_records",
    "outcome_records",
    "interview_prep_packs",
  ]) {
    const tableStart = migration.indexOf(`create table if not exists public.${table}`)
    assert.notEqual(tableStart, -1, `${table} must be defined in the workflow schema`)
    const nextTable = migration.indexOf("create table", tableStart + 1)
    const definition = migration.slice(
      tableStart,
      nextTable === -1 ? migration.length : nextTable,
    )
    assert.match(
      definition,
      /user_id uuid not null references auth\.users\(id\) on delete cascade/,
      `${table} must be erased when its owning auth user is deleted`,
    )
  }
})

test("the orphaned insights URL redirects to the live applications workspace", () => {
  const page = read("apps/web/app/dashboard/insights/page.tsx")

  assert.match(page, /import \{ redirect \} from "next\/navigation"/)
  assert.match(page, /redirect\("\/dashboard\/applications"\)/)
  assert.doesNotMatch(page, /DashboardExperience/)
})
