import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const checks = [
  {
    name: "Extension unit tests",
    command: getCommandName("pnpm"),
    args: ["--filter", "extension", "test"]
  },
  {
    name: "Extension typecheck",
    command: getCommandName("pnpm"),
    args: ["--filter", "extension", "typecheck"]
  },
  {
    name: "Extension lint",
    command: getCommandName("pnpm"),
    args: ["--filter", "extension", "lint"]
  },
  {
    name: "Extension production build",
    command: getCommandName("pnpm"),
    args: ["--filter", "extension", "build"]
  }
]

function getCommandName(command) {
  return process.platform === "win32" ? `${command}.cmd` : command
}

function run(command, args) {
  return execSync([command, ...args].join(" "), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  })
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
const reportDir = join("docs", "release-runs")
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
  "- [ ] Complete `docs/extension-smoke-test.md`.",
  "- [ ] Confirm no flow submits an application form.",
  "- [ ] Confirm saved content insertion requires an explicit click.",
  "- [ ] Validate LinkedIn import on a live UK/EU job.",
  "- [ ] Validate Greenhouse import on a live UK/EU job.",
  "- [ ] Validate Lever import on a live UK/EU job.",
  "- [ ] Validate Workday import on a live UK/EU job.",
  "- [ ] Export Applications CSV.",
  "- [ ] Export Validation Metrics CSV.",
  "- [ ] Complete a copied `docs/founder-validation-report.md`.",
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
