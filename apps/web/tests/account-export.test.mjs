import assert from "node:assert/strict"
import { exportedTables } from "../lib/account-export.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("includes every real per-user content table with an ownership link to auth.users", () => {
  const mustInclude = [
    "profiles",
    "profile_revisions",
    "applications",
    "reusable_answers",
    "job_workflow_jobs",
    "job_workflow_analysis_snapshots",
    "job_workflow_applications",
    "job_workflow_screening_answers",
    "interview_records",
    "interview_questions",
    "interview_preparation_snapshots",
    "cover_letters",
    "outreach_contacts",
    "outreach_messages",
    "user_skill_profile",
    "esco_questionnaire_answers",
  ]

  for (const table of mustInclude) {
    assert.ok(
      exportedTables.includes(table),
      `expected exportedTables to include "${table}" - a real, server-synced per-user content table`,
    )
  }
})

test("excludes operational/metering tables and admin_memberships", () => {
  const mustExclude = [
    "operational_logs",
    "ai_usage",
    "ai_credit_ledger",
    "sync_events",
    "extension_connections",
    "deleted_application_tombstones",
    "workflow_operational_events",
    "admin_memberships",
  ]

  for (const table of mustExclude) {
    assert.ok(
      !exportedTables.includes(table),
      `expected exportedTables to exclude "${table}" - not user-provided content`,
    )
  }
})

test("contains no duplicate table names", () => {
  assert.equal(new Set(exportedTables).size, exportedTables.length)
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
