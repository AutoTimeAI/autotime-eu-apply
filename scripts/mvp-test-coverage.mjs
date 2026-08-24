/** Enforces that MVP requirements remain represented in the automated test inventory. */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const automatedCoverageTargetPercent = 90

export const coverageMatrix = [
  {
    area: "Extension domain logic",
    weight: 20,
    mode: "automated",
    evidence:
      "apps/extension/tests/run-tests.mjs covers autofill detection, validation, storage, job analysis, tracker, CSV, and V2 export contracts."
  },
  {
    area: "Privacy and local-first safety",
    weight: 12,
    mode: "automated",
    evidence:
      "Release checks, extension tests, LinkedIn policy assertions, and storage tests cover local-only data flow and no hidden submission behavior at the logic layer."
  },
  {
    area: "Job platform policy and import inference",
    weight: 12,
    mode: "automated",
    evidence:
      "Extension tests cover LinkedIn manual-only policy plus Greenhouse, Lever, Workday, and expanded ATS platform detection."
  },
  {
    area: "Tracker, applications, CSV, and validation metrics",
    weight: 12,
    mode: "automated",
    evidence:
      "Extension tests cover saved application CRUD, status normalization, duplicate URL detection, filtering, CSV export, and validation metrics CSV."
  },
  {
    area: "AI guardrails and fallback behavior",
    weight: 9,
    mode: "automated",
    evidence:
      "Extension and web tests cover cost estimation, response normalization, budget/key gating, and local fallback paths."
  },
  {
    area: "V2 dashboard data contracts and interview prep",
    weight: 12,
    mode: "automated",
    evidence:
      "Shared schema validation, dashboard export compatibility, and web interview prep tests cover V2 data flow without cloud sync."
  },
  {
    area: "Web dashboard smoke coverage",
    weight: 6,
    mode: "automated",
    evidence:
      "Web smoke tests verify deployed/preview HTML markers for the V2 dashboard shell."
  },
  {
    area: "Static quality and production builds",
    weight: 12,
    mode: "automated",
    evidence:
      "MVP automation runs typecheck, lint, extension build, and web build."
  },
  {
    area: "Manual Chrome side-panel UX confirmation",
    weight: 2,
    mode: "manual",
    evidence:
      "Chrome extension loading, side-panel rendering, visual UX, and browser permission prompts remain manual evidence."
  },
  {
    area: "Live UK/EU selector drift confirmation",
    weight: 2,
    mode: "manual",
    evidence:
      "Live LinkedIn manual copy/paste and Greenhouse, Lever, Workday selector behavior remain manual because job sites can change without repo changes."
  },
  {
    area: "Controlled live AI-key validation",
    weight: 1,
    mode: "manual",
    evidence:
      "A real controlled-cost OpenAI key check remains manual before AI-enabled release."
  }
]

const requiredPackageScripts = [
  "release:check",
  "test:mvp",
  "test",
  "test:smoke:web",
  "test:web:interview",
  "test:validation-run",
  "validation:new",
  "typecheck",
  "build:extension",
  "build:web"
]

const requiredEvidenceFiles = [
  "docs/reference/extension-smoke-test.md",
  "docs/reference/v2-smoke-test.md",
  "docs/reference/release-readiness.md",
  "docs/reference/founder-validation-report.md",
  "scripts/mvp-automation-toolkit.mjs",
  "scripts/release-check.mjs",
  "scripts/validation-run.mjs",
  "scripts/validation-run.test.mjs"
]

const requiredTestMarkers = [
  {
    file: "apps/extension/tests/run-tests.mjs",
    markers: [
      "detects priority job platforms from urls",
      "marks LinkedIn as manual input only",
      "exports applications to csv",
      "exports founder validation metrics to csv",
      "creates V2 dashboard export compatible with shared schema"
    ]
  },
  {
    file: "apps/web/tests/interview-prep.test.mjs",
    markers: [
      "creates local interview prep pack without AI",
      "checks web AI budget and key availability",
      "generates AI interview prep from mocked OpenAI response"
    ]
  },
  {
    file: "scripts/smoke-web-dashboard.test.mjs",
    markers: [
      "passes when deployed dashboard HTML contains expected markers",
      "fails when expected dashboard markers are missing"
    ]
  }
]

export function getCoverageSummary(matrix = coverageMatrix) {
  const automatedPercent = matrix
    .filter((item) => item.mode === "automated")
    .reduce((sum, item) => sum + item.weight, 0)
  const manualPercent = matrix
    .filter((item) => item.mode === "manual")
    .reduce((sum, item) => sum + item.weight, 0)

  return {
    automatedPercent,
    manualPercent,
    totalPercent: automatedPercent + manualPercent
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

export function validateMvpCoverage({
  packageJson = readJson("package.json"),
  readFile = (path) => readFileSync(path, "utf8")
} = {}) {
  const summary = getCoverageSummary()

  assert.equal(summary.totalPercent, 100)
  assert.ok(
    summary.automatedPercent >= automatedCoverageTargetPercent,
    `automated coverage ${summary.automatedPercent}% is below target ${automatedCoverageTargetPercent}%`
  )

  for (const scriptName of requiredPackageScripts) {
    assert.ok(
      packageJson.scripts?.[scriptName],
      `missing package script: ${scriptName}`
    )
  }

  for (const file of requiredEvidenceFiles) {
    assert.doesNotThrow(() => readFile(file), `missing evidence file: ${file}`)
  }

  for (const { file, markers } of requiredTestMarkers) {
    const content = readFile(file)
    for (const marker of markers) {
      assert.ok(content.includes(marker), `missing marker in ${file}: ${marker}`)
    }
  }

  return summary
}

function main() {
  const summary = validateMvpCoverage()

  console.log(
    `MVP automated testing coverage target met: ${summary.automatedPercent}% automated, ${summary.manualPercent}% manual`
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main()
  } catch (error) {
    console.error(
      error instanceof Error
        ? `MVP testing coverage check failed: ${error.message}`
        : "MVP testing coverage check failed"
    )
    process.exitCode = 1
  }
}
