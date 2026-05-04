import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

export const validationRunDir = join("docs", "founder-validation-runs")

export function getDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getTimestampStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-")
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  })

  if (result.status !== 0 || result.error) {
    return ""
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
}

export function getGitMetadata() {
  return {
    branch: run("git", ["branch", "--show-current"]) || "unknown",
    commitSha: run("git", ["rev-parse", "HEAD"]) || "unknown"
  }
}

export function createValidationReport({
  now = new Date(),
  tester = "Rajan",
  chromeVersion = "Pending manual entry",
  operatingSystem = `${process.platform} ${process.arch}`,
  branch = "unknown",
  commitSha = "unknown",
  automatedReportPath = "Pending new automation run",
  releaseCheckPath = "Pending new release check"
} = {}) {
  const date = getDateStamp(now)

  return [
    "# Founder Validation Report",
    "",
    "## Build",
    "",
    `- Date: ${date}`,
    `- Branch: ${branch}`,
    `- Commit SHA: \`${commitSha}\``,
    "- Extension build path: `apps/extension/.output/chrome-mv3`",
    `- Tester: ${tester}`,
    `- Chrome version: ${chromeVersion}`,
    `- Operating system: ${operatingSystem}`,
    `- Automated release check: ${releaseCheckPath}`,
    `- MVP automation report: ${automatedReportPath}`,
    "",
    "## Automated Testing Gate",
    "",
    "Run these before manual release validation and link the generated reports above.",
    "",
    "- [ ] `pnpm release:check` passed",
    "- [ ] `SKIP_LIVE_SMOKE=1 pnpm test:mvp` passed for offline/local validation, or `pnpm test:mvp` passed with deployed smoke enabled",
    "- [ ] `pnpm build:extension` produced `apps/extension/.output/chrome-mv3`",
    "- [ ] `pnpm build:web` passed if V2 dashboard changed",
    "- [ ] `pnpm test:smoke:web` passed if dashboard smoke markers changed",
    "- [ ] `pnpm test:web:interview` passed if interview prep changed",
    "",
    "## Extension Smoke Test",
    "",
    "- Result: Not run",
    "- Checklist used: `docs/extension-smoke-test.md`",
    "- Chrome extension loaded from: `apps/extension/.output/chrome-mv3`",
    "- Blockers:",
    "- Follow-up fixes:",
    "",
    "## V2 Dashboard Smoke Test",
    "",
    "- Result: Not run",
    "- Checklist used: `docs/v2-smoke-test.md`",
    "- Preview or deployed URL:",
    "- Import/export checked:",
    "- Interview prep checked:",
    "- Responsive check completed:",
    "",
    "## Privacy And Safety",
    "",
    "- No auto-submit observed:",
    "- Autofill only ran after explicit click:",
    "- Saved content insertion only filled empty matching textareas:",
    "- LinkedIn remained manual copy/paste only:",
    "- CSV export contained only locally saved applications:",
    "- AI key used:",
    "- AI usage/cost log checked:",
    "",
    "## Live Job Validation",
    "",
    "Record at least five real UK/EU roles before calling the MVP validation loop complete.",
    "",
    "| # | Platform | Role | Company | Country | URL or source | Import OK | Content OK | Status | Outcome notes |",
    "|---|---|---|---|---|---|---|---|---|---|",
    "| 1 | LinkedIn |  |  |  |  | N/A - manual copy/paste only | Not run | Saved |  |",
    "| 2 | Greenhouse |  |  |  |  | Not run | Not run | Saved |  |",
    "| 3 | Lever |  |  |  |  | Not run | Not run | Saved |  |",
    "| 4 | Workday |  |  |  |  | Not run | Not run | Saved |  |",
    "| 5 | Other |  |  |  |  | Not run | Not run | Saved |  |",
    "",
    "For `Import OK`, mark `Yes` only if tracker or job-analysis import captures the role title, company when visible, application URL, platform/source, and location notes when exposed by the page. For LinkedIn, keep `Import OK` as `N/A - manual copy/paste only`; do not use active-page import, autofill, saved-content insertion, or current-tab application capture on LinkedIn pages.",
    "",
    "## Export Evidence",
    "",
    "- Applications CSV exported:",
    "- Applications CSV reviewed for local-only saved data:",
    "- Validation Metrics CSV exported:",
    "- V2 Dashboard JSON exported, if V2 flow changed:",
    "- V2 Dashboard JSON imported successfully, if V2 flow changed:",
    "",
    "## Validation Metrics Snapshot",
    "",
    "- Total applications tracked:",
    "- Content snapshot coverage:",
    "- Next-action coverage:",
    "- Outcome-note coverage:",
    "- Top sources:",
    "",
    "## Decision",
    "",
    "- MVP validation result: Not ready",
    "- Release decision:",
    "- Highest-risk remaining issue:",
    "- Next action:",
    ""
  ].join("\n")
}

export function createValidationRun({
  now = new Date(),
  filename,
  ...reportOptions
} = {}) {
  const report = createValidationReport({ now, ...reportOptions })
  const reportDir = validationRunDir
  const reportPath = join(
    reportDir,
    filename ?? `${getTimestampStamp(now)}-manual-validation.md`
  )

  mkdirSync(reportDir, { recursive: true })

  if (existsSync(reportPath)) {
    throw new Error(`validation report already exists: ${reportPath}`)
  }

  writeFileSync(reportPath, report)

  return reportPath
}

function main() {
  const metadata = getGitMetadata()
  const reportPath = createValidationRun({
    ...metadata,
    automatedReportPath:
      "Run `pnpm test:mvp`, then paste the generated `docs/automation-runs/...` path here",
    releaseCheckPath:
      "Run `pnpm release:check`, then paste the generated `docs/release-runs/...` path here"
  })

  console.log(`Founder validation report created at ${reportPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (error) {
    console.error(
      error instanceof Error
        ? `Failed to create validation report: ${error.message}`
        : "Failed to create validation report"
    )
    process.exitCode = 1
  }
}
