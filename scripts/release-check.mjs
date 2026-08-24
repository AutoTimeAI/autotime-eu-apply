import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const checks = [
  {
    name: "Extension unit tests",
    command: "pnpm",
    args: ["--filter", "extension", "test"]
  },
  {
    name: "Repo typecheck",
    command: "pnpm",
    args: ["-r", "typecheck"]
  },
  {
    name: "Repo lint",
    command: "pnpm",
    args: ["-r", "lint"]
  },
  {
    name: "Extension production build",
    command: "pnpm",
    args: ["--filter", "extension", "build"]
  }
]

function run(command, args) {
  const commandLine = [command, ...args].join(" ")
  const result = spawnSync(
    process.platform === "win32" ? commandLine : command,
    process.platform === "win32" ? [] : args,
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"]
    }
  )

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()

  if (result.error) {
    throw new Error(`${output}\n${result.error.message}`.trim())
  }

  if (result.status !== 0) {
    throw new Error(output)
  }

  return output
}

function getGitValue(args, fallback = "unknown") {
  try {
    return run("git", args).trim() || fallback
  } catch {
    return fallback
  }
}

const startedAt = new Date()
const results = []
let failed = false

for (const check of checks) {
  process.stdout.write(`Running ${check.name}... `)

  try {
    const output = run(check.command, check.args)
    results.push({ ...check, status: "PASS", output })
    process.stdout.write("PASS\n")
  } catch (error) {
    failed = true
    results.push({
      ...check,
      status: "FAIL",
      output:
        `${error.stdout ?? ""}${error.stderr ?? ""}${error.message ?? ""}`.trim()
    })
    process.stdout.write("FAIL\n")
  }
}

const finishedAt = new Date()
const commitSha = getGitValue(["rev-parse", "HEAD"])
const branch = getGitValue(["branch", "--show-current"])
const shortStamp = finishedAt.toISOString().replace(/[:.]/g, "-")
const reportDir = join("docs", "reports", "release-runs")
const reportPath = join(reportDir, `${shortStamp}.md`)

mkdirSync(reportDir, { recursive: true })

const report = [
  "# Release Check Report",
  "",
  "## Build",
  "",
  `- Started at: ${startedAt.toISOString()}`,
  `- Finished at: ${finishedAt.toISOString()}`,
  `- Branch: ${branch}`,
  `- Commit SHA: ${commitSha}`,
  "- Extension build path: `apps/extension/.output/chrome-mv3`",
  "",
  "## Automated Checks",
  "",
  ...results.flatMap((result) => [
    `### ${result.status} - ${result.name}`,
    "",
    "```text",
    `${result.command} ${result.args.join(" ")}`,
    "```",
    ...(result.status === "FAIL"
      ? ["", "Output:", "", "```text", result.output.slice(-4000), "```"]
      : []),
    ""
  ]),
  "## Manual Checks Still Required",
  "",
  "- [ ] Load or reload `apps/extension/.output/chrome-mv3` in Chrome.",
  "- [ ] Complete `docs/reference/extension-smoke-test.md`.",
  "- [ ] Confirm no flow submits an application form.",
  "- [ ] Confirm saved content insertion requires an explicit click.",
  "- [ ] Validate LinkedIn manual copy/paste on a live UK/EU job; do not use import, autofill, saved-content insertion, or current-tab capture on LinkedIn.",
  "- [ ] Validate Greenhouse import on a live UK/EU job.",
  "- [ ] Validate Lever import on a live UK/EU job.",
  "- [ ] Validate Workday import on a live UK/EU job.",
  "- [ ] Export Applications CSV.",
  "- [ ] Export Validation Metrics CSV.",
  "- [ ] Run `pnpm validation:new` and complete the generated `docs/reports/founder-validation-runs/...` report.",
  "",
  "## Result",
  "",
  failed
    ? "Automated release checks failed. Fix failures before manual release validation."
    : "Automated release checks passed. Manual Chrome and live job validation remain.",
  ""
].join("\n")

writeFileSync(reportPath, report)
console.log(`Release check report written to ${reportPath}`)

if (failed) {
  process.exitCode = 1
}
