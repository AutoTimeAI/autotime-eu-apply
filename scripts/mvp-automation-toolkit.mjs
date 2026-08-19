import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const skipLiveSmoke = process.env.SKIP_LIVE_SMOKE === "1"

const offlineWebBuildEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline-build-anon-key",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_offline_build",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  SUPABASE_SERVICE_ROLE_KEY: "offline-build-service-role-key",
  OPENAI_API_KEY: "offline-build-openai-key",
  STRIPE_SECRET_KEY: "sk_test_offline_build",
  STRIPE_WEBHOOK_SECRET: "whsec_offline_build",
  STRIPE_PRO_MONTHLY_PRICE_ID: "price_offline_monthly",
  STRIPE_PRO_QUARTERLY_PRICE_ID: "price_offline_quarterly",
  STRIPE_AI_CREDIT_PACK_PRICE_ID: "price_offline_credit_pack",
  RESEND_API_KEY: "re_offline_build"
}

const checks = [
  {
    name: "Extension unit tests",
    command: "pnpm",
    args: ["test"],
    area: "Extension"
  },
  {
    name: "Web AI interview-prep unit tests",
    command: "pnpm",
    args: ["test:web:interview"],
    area: "AI Interview Prep"
  },
  {
    name: "Web smoke automation unit tests",
    command: "pnpm",
    args: ["test:smoke:web"],
    area: "Web Automation"
  },
  {
    name: "Validation run generator tests",
    command: "pnpm",
    args: ["test:validation-run"],
    area: "Validation Evidence"
  },
  {
    name: "MVP automated testing coverage gate",
    command: "pnpm",
    args: ["test:mvp:coverage"],
    area: "Validation Evidence"
  },
  {
    name: "Repo typecheck",
    command: "pnpm",
    args: ["-r", "typecheck"],
    area: "Static Checks"
  },
  {
    name: "Repo lint",
    command: "pnpm",
    args: ["-r", "lint"],
    area: "Static Checks"
  },
  {
    name: "Extension production build",
    command: "pnpm",
    args: ["build:extension"],
    area: "Build"
  },
  {
    name: "Web production build",
    command: "pnpm",
    args: ["build:web"],
    area: "Build",
    env: offlineWebBuildEnv
  },
  ...(skipLiveSmoke
    ? []
    : [
        {
          name: "Deployed web dashboard smoke test",
          command: "pnpm",
          args: ["smoke:web"],
          area: "Deployment"
        }
      ])
]

function run(command, args, options = {}) {
  const commandLine = [command, ...args].join(" ")
  const result = spawnSync(
    process.platform === "win32" ? commandLine : command,
    process.platform === "win32" ? [] : args,
    {
      encoding: "utf8",
      env: {
        ...process.env,
        ...(options.env ?? {})
      },
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
    const output = run(check.command, check.args, { env: check.env })
    results.push({ ...check, status: "PASS", output })
    process.stdout.write("PASS\n")
  } catch (error) {
    failed = true
    results.push({
      ...check,
      status: "FAIL",
      output: `${error.message ?? ""}`.trim()
    })
    process.stdout.write("FAIL\n")
  }
}

const finishedAt = new Date()
const commitSha = getGitValue(["rev-parse", "HEAD"])
const branch = getGitValue(["branch", "--show-current"])
const shortStamp = finishedAt.toISOString().replace(/[:.]/g, "-")
const reportDir = join("docs", "automation-runs")
const reportPath = join(reportDir, `${shortStamp}.md`)

mkdirSync(reportDir, { recursive: true })

const passCount = results.filter((result) => result.status === "PASS").length
const failCount = results.length - passCount

const report = [
  "# MVP Automation Toolkit Report",
  "",
  "## Run",
  "",
  `- Started at: ${startedAt.toISOString()}`,
  `- Finished at: ${finishedAt.toISOString()}`,
  `- Branch: ${branch}`,
  `- Commit SHA: ${commitSha}`,
  `- Checks passed: ${passCount}/${results.length}`,
  `- Live deployed smoke skipped: ${skipLiveSmoke ? "Yes" : "No"}`,
  "",
  "## Automated Checks",
  "",
  ...results.flatMap((result) => [
    `### ${result.status} - ${result.name}`,
    "",
    `- Area: ${result.area}`,
    "",
    "```text",
    `${result.command} ${result.args.join(" ")}`,
    "```",
    ...(result.status === "FAIL"
      ? ["", "Output:", "", "```text", result.output.slice(-4000), "```"]
      : []),
    ""
  ]),
  "## AI Interview Prep Coverage",
  "",
  "- Mocked OpenAI response normalization is covered by `pnpm test:web:interview`.",
  "- Local deterministic interview prep fallback is covered by `pnpm test:web:interview`.",
  "- Budget/key gating is covered by `pnpm test:web:interview`.",
  "- Live controlled-cost OpenAI key validation remains manual before a wider AI-enabled release.",
  "",
  "## Validation Evidence Coverage",
  "",
  "- Founder validation report generation is covered by `pnpm test:validation-run`.",
  "- The 90%+ automated MVP testing target is enforced by `pnpm test:mvp:coverage`.",
  "- Create a fresh evidence file with `pnpm validation:new` before manual Chrome/live-job validation.",
  "",
  "## Manual Evidence Still Required",
  "",
  "- [ ] Load or reload `apps/extension/.output/chrome-mv3` in Chrome.",
  "- [ ] Complete `docs/extension-smoke-test.md`.",
  "- [ ] Complete `docs/v2-smoke-test.md` against the deployed dashboard.",
  "- [ ] Validate LinkedIn manual copy/paste on a live UK/EU job.",
  "- [ ] Validate Greenhouse, Lever, and Workday import on live UK/EU jobs.",
  "- [ ] Export Applications CSV.",
  "- [ ] Export Validation Metrics CSV.",
  "- [ ] Record final values in the current `docs/founder-validation-runs/...` validation report.",
  "",
  "## Result",
  "",
  failCount > 0
    ? "Automation failed. Fix failing checks before final MVP validation."
    : "Automation passed. Final MVP blockers are manual Chrome/live-job/CSV evidence.",
  ""
].join("\n")

writeFileSync(reportPath, report)
console.log(`MVP automation report written to ${reportPath}`)

if (failed) {
  process.exitCode = 1
}
