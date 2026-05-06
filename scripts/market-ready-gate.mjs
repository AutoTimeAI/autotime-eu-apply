import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const validationDir = join("docs", "founder-validation-runs")

const requiredPrivacyLabels = [
  "No auto-submit observed",
  "Autofill only ran after explicit click",
  "Saved content insertion only filled empty matching textareas",
  "LinkedIn remained manual copy/paste only",
  "CSV export contained only locally saved applications",
  "AI key used",
  "AI usage/cost log checked"
]

const requiredMetricLabels = [
  "Total applications tracked",
  "Content snapshot coverage",
  "Next-action coverage",
  "Outcome-note coverage",
  "Top sources"
]

const requiredExportLabels = [
  "Applications CSV exported",
  "Applications CSV reviewed for local-only saved data",
  "Validation Metrics CSV exported"
]

const requiredPlatforms = ["LinkedIn", "Greenhouse", "Lever", "Workday", "Other"]
const weakEvidencePattern =
  /\b(pending|not run|not ready|todo|tbd|n\/a\s*$|needs recorded|manual entry)\b/i

function normalize(value) {
  return value.replace(/\s+/g, " ").trim()
}

function getLineValue(content, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = content.match(new RegExp(`^-\\s*${escapedLabel}:\\s*(.*)$`, "im"))
  return match?.[1]?.trim() ?? ""
}

function hasStrongValue(value) {
  const clean = normalize(value)
  return Boolean(clean) && !weakEvidencePattern.test(clean)
}

function addValueCheck(findings, content, label, sectionName = label) {
  const value = getLineValue(content, label)

  if (!hasStrongValue(value)) {
    findings.push(`${sectionName} is missing completed evidence`)
  }
}

function parseTableRows(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => normalize(cell))
    )
}

function validateLiveJobRows(findings, content) {
  const rows = parseTableRows(content)

  if (rows.length < 5) {
    findings.push("Live Job Validation needs at least five recorded roles")
    return
  }

  for (const platform of requiredPlatforms) {
    const row = rows.find((cells) => cells[1]?.toLowerCase() === platform.toLowerCase())

    if (!row) {
      findings.push(`Live Job Validation is missing the ${platform} row`)
      continue
    }

    const role = row[2] ?? ""
    const company = row[3] ?? ""
    const country = row[4] ?? ""
    const importOk = row.length >= 10 ? row[6] : row[5]
    const contentOk = row.length >= 10 ? row[7] : row[6]
    const status = row.length >= 10 ? row[8] : row[7]
    const outcomeNotes = row.length >= 10 ? row[9] : row[8]

    if (!hasStrongValue(role)) {
      findings.push(`${platform} live row needs a real role title`)
    }

    if (!hasStrongValue(company)) {
      findings.push(`${platform} live row needs a real company`)
    }

    if (!hasStrongValue(country)) {
      findings.push(`${platform} live row needs a country`)
    }

    if (platform === "LinkedIn") {
      if (!/manual copy\/paste/i.test(importOk)) {
        findings.push("LinkedIn Import OK must stay manual copy/paste only")
      }
    } else if (!/^yes\b/i.test(importOk)) {
      findings.push(`${platform} Import OK must be marked Yes after live validation`)
    }

    if (!/^yes\b/i.test(contentOk)) {
      findings.push(`${platform} Content OK must be marked Yes after live validation`)
    }

    if (!hasStrongValue(status)) {
      findings.push(`${platform} live row needs a tracked application status`)
    }

    if (!hasStrongValue(outcomeNotes)) {
      findings.push(`${platform} live row needs outcome notes`)
    }
  }
}

export function findLatestValidationReport(dir = validationDir) {
  if (!existsSync(dir)) {
    return ""
  }

  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()

  return files.length ? join(dir, files.at(-1)) : ""
}

export function analyzeValidationReport(content) {
  const findings = []

  addValueCheck(findings, content, "Chrome version")
  addValueCheck(findings, content, "Automated release check")
  addValueCheck(findings, content, "MVP automation report")

  const extensionResult = content.match(
    /## Extension Smoke Test[\s\S]*?- Result:\s*(.*)/i
  )?.[1]
  if (!hasStrongValue(extensionResult ?? "")) {
    findings.push("Extension Smoke Test result is not completed")
  }

  const dashboardResult = content.match(
    /## V2 Dashboard Smoke Test[\s\S]*?- Result:\s*(.*)/i
  )?.[1]
  if (!hasStrongValue(dashboardResult ?? "")) {
    findings.push("V2 Dashboard Smoke Test result is not completed")
  }

  for (const label of requiredPrivacyLabels) {
    addValueCheck(findings, content, label, `Privacy and Safety: ${label}`)
  }

  validateLiveJobRows(findings, content)

  for (const label of requiredExportLabels) {
    addValueCheck(findings, content, label, `Export Evidence: ${label}`)
  }

  for (const label of requiredMetricLabels) {
    addValueCheck(findings, content, label, `Validation Metrics Snapshot: ${label}`)
  }

  const validationResult = getLineValue(content, "MVP validation result")
  if (!hasStrongValue(validationResult)) {
    findings.push("Decision: MVP validation result must be completed")
  }

  const releaseDecision = getLineValue(content, "Release decision")
  if (!hasStrongValue(releaseDecision)) {
    findings.push("Decision: release decision must be completed")
  }

  return findings
}

function run(command, args, options = {}) {
  const executable = process.platform === "win32" && command === "pnpm" ? "cmd.exe" : command
  const executableArgs =
    process.platform === "win32" && command === "pnpm"
      ? ["/d", "/s", "/c", ["pnpm", ...args].join(" ")]
      : args
  const result = spawnSync(executable, executableArgs, {
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      ...(options.env ?? {})
    }
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`)
  }
}

function parseArgs(argv) {
  const options = {
    evidencePath: "",
    runAutomated: false,
    liveSmoke: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--evidence") {
      options.evidencePath = argv[index + 1] ?? ""
      index += 1
    } else if (arg === "--run-automated") {
      options.runAutomated = true
    } else if (arg === "--live-smoke") {
      options.liveSmoke = true
    }
  }

  return options
}

function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.runAutomated) {
    run("pnpm", ["release:check"])
    run("pnpm", ["test:mvp:coverage"])
    run("pnpm", ["test:validation-run"])
    run("pnpm", ["test:smoke:web"])
    run("pnpm", ["test:web:interview"])
    run("pnpm", ["test:mvp"], {
      env: options.liveSmoke ? {} : { SKIP_LIVE_SMOKE: "1" }
    })
  }

  const evidencePath = options.evidencePath || findLatestValidationReport()

  if (!evidencePath) {
    throw new Error("No founder validation report found. Run `pnpm validation:new` first.")
  }

  const content = readFileSync(evidencePath, "utf8")
  const findings = analyzeValidationReport(content)

  if (findings.length > 0) {
    console.error(`Market-ready gate failed for ${evidencePath}`)
    for (const finding of findings) {
      console.error(`- ${finding}`)
    }
    process.exitCode = 1
    return
  }

  console.log(`Market-ready gate passed for ${evidencePath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (error) {
    console.error(
      error instanceof Error
        ? `Market-ready gate failed: ${error.message}`
        : "Market-ready gate failed"
    )
    process.exitCode = 1
  }
}
