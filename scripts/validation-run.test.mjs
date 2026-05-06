import assert from "node:assert/strict"
import {
  createValidationReport,
  findLatestReportPath,
  getDateStamp,
  getTimestampStamp
} from "./validation-run.mjs"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const fixedDate = new Date("2026-05-04T20:15:30.123Z")

test("formats stable validation report dates", () => {
  assert.equal(getDateStamp(fixedDate), "2026-05-04")
  assert.equal(getTimestampStamp(fixedDate), "2026-05-04T20-15-30-123Z")
})

test("creates a validation report with build metadata", () => {
  const report = createValidationReport({
    now: fixedDate,
    branch: "main",
    commitSha: "abc123",
    tester: "Rajan",
    chromeVersion: "124.0.0.0",
    operatingSystem: "Windows",
    automatedReportPath: "`docs/automation-runs/run.md`",
    releaseCheckPath: "`docs/release-runs/run.md`"
  })

  assert.match(report, /- Date: 2026-05-04/)
  assert.match(report, /- Branch: main/)
  assert.match(report, /- Commit SHA: `abc123`/)
  assert.match(report, /- Tester: Rajan/)
  assert.match(report, /- Chrome version: 124\.0\.0\.0/)
  assert.match(report, /- Operating system: Windows/)
  assert.match(
    report,
    /- Automated release check: `docs\/release-runs\/run\.md`/
  )
  assert.match(
    report,
    /- MVP automation report: `docs\/automation-runs\/run\.md`/
  )
})

test("includes the automated and manual testing gates", () => {
  const report = createValidationReport({ now: fixedDate })

  assert.match(report, /## Automated Testing Gate/)
  assert.match(report, /`pnpm release:check` passed/)
  assert.match(report, /`SKIP_LIVE_SMOKE=1 pnpm test:mvp` passed/)
  assert.match(report, /## Extension Smoke Test/)
  assert.match(report, /docs\/extension-smoke-test\.md/)
  assert.match(report, /## V2 Dashboard Smoke Test/)
  assert.match(report, /docs\/v2-smoke-test\.md/)
})

test("keeps LinkedIn and live platform validation explicit", () => {
  const report = createValidationReport({ now: fixedDate })

  assert.match(report, /\| 1 \| LinkedIn /)
  assert.match(report, /N\/A - manual copy\/paste only/)
  assert.match(report, /\| 2 \| Greenhouse /)
  assert.match(report, /\| 3 \| Lever /)
  assert.match(report, /\| 4 \| Workday /)
  assert.match(report, /do not use active-page import/)
})

test("includes export evidence and release decision sections", () => {
  const report = createValidationReport({ now: fixedDate })

  assert.match(report, /## Export Evidence/)
  assert.match(report, /Applications CSV exported/)
  assert.match(report, /Validation Metrics CSV exported/)
  assert.match(report, /V2 Dashboard JSON exported/)
  assert.match(report, /## Decision/)
  assert.match(report, /MVP validation result: Not ready/)
})

test("finds the latest markdown report in a report directory", () => {
  const latest = findLatestReportPath("docs/release-runs")

  assert.ok(latest.endsWith(".md"))
  assert.match(latest, /docs[\\/]release-runs[\\/]/)
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
