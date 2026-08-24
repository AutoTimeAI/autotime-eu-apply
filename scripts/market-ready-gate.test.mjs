import assert from "node:assert/strict"
import { analyzeValidationReport } from "./market-ready-gate.mjs"

const completeReport = `
# Founder Validation Report

## Build

- Date: 2026-05-06
- Branch: main
- Commit SHA: \`abc123\`
- Chrome version: 124.0.0.0
- Automated release check: \`docs/reports/release-runs/run.md\`
- MVP automation report: \`docs/reports/automation-runs/run.md\`

## Extension Smoke Test

- Result: Passed

## V2 Dashboard Smoke Test

- Result: Passed

## Privacy And Safety

- No auto-submit observed: Yes
- Autofill only ran after explicit click: Yes
- Saved content insertion only filled empty matching textareas: Yes
- LinkedIn remained manual copy/paste only: Yes
- CSV export contained only locally saved applications: Yes
- AI key used: Local fallback and controlled-cost key checked
- AI usage/cost log checked: Yes

## Live Job Validation

| # | Platform | Role | Company | Country | URL or source | Import OK | Content OK | Status | Outcome notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | LinkedIn | Business Analyst | Example One | Ireland | linkedin.com/jobs/example | N/A - manual copy/paste only | Yes | Saved | Manual paste evidence captured |
| 2 | Greenhouse | Systems Analyst | Example Two | United Kingdom | greenhouse.io/example | Yes | Yes | Applied | Imported title, company and URL |
| 3 | Lever | Product Analyst | Example Three | Germany | jobs.lever.co/example | Yes | Yes | Applied | Imported and generated content |
| 4 | Workday | Application Analyst | Example Four | Netherlands | myworkdayjobs.com/example | Yes | Yes | Saved | Workday import checked |
| 5 | Other | Technical BA | Example Five | Poland | example.com/careers | Yes | Yes | Interview | Manual fallback checked |

## Export Evidence

- Applications CSV exported: Yes, \`exports/applications.csv\`
- Applications CSV reviewed for local-only saved data: Yes
- Validation Metrics CSV exported: Yes, \`exports/metrics.csv\`

## Validation Metrics Snapshot

- Total applications tracked: 5
- Content snapshot coverage: 100%
- Next-action coverage: 100%
- Outcome-note coverage: 100%
- Top sources: LinkedIn, Greenhouse, Lever, Workday, Other

## Decision

- MVP validation result: Passed market-ready validation
- Release decision: Tag v0.0.2 and run controlled pilot
`

const pendingReport = completeReport
  .replace("- Chrome version: 124.0.0.0", "- Chrome version: Pending manual entry")
  .replace("| 2 | Greenhouse | Systems Analyst", "| 2 | Greenhouse | Pending exact role")
  .replace("- Validation Metrics CSV exported: Yes", "- Validation Metrics CSV exported: Pending CSV export")

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("passes completed market-readiness evidence", () => {
  assert.deepEqual(analyzeValidationReport(completeReport), [])
})

test("fails incomplete market-readiness evidence", () => {
  const findings = analyzeValidationReport(pendingReport)

  assert.ok(findings.some((finding) => finding.includes("Chrome version")))
  assert.ok(findings.some((finding) => finding.includes("Greenhouse")))
  assert.ok(
    findings.some((finding) =>
      finding.includes("Validation Metrics CSV exported")
    )
  )
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
