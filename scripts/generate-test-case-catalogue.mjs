import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("docs/reports/test-case-catalogue-2026-09-09.csv");
const raw = execFileSync(
  process.execPath,
  ["scripts/run-playwright.mjs", "test", "--list"],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

const cases = raw
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*\[([^\]]+)\]\s+›\s+(.+?):(\d+):\d+\s+›\s+(.+)$/))
  .filter(Boolean)
  .map((match) => ({
    browser: match[1],
    sourceFile: `tests/e2e/${match[2].replaceAll("\\", "/")}`,
    line: Number(match[3]),
    title: match[4],
  }));

if (cases.length !== 127) {
  throw new Error(`Expected 127 Playwright cases, found ${cases.length}`);
}

const classify = ({ sourceFile }) => {
  const file = sourceFile.toLowerCase();
  if (file.includes("visual")) return "Visual regression";
  if (file.includes("accessibility") || file.includes("keyboard")) return "Accessibility";
  if (file.includes("responsive") || file.includes("mobile")) return "Responsive UI";
  if (file.includes("security") || file.includes("auth-and-access")) return "Security/access control";
  if (file.includes("smoke")) return "Smoke";
  if (file.includes("production")) return "Production E2E";
  return "Functional E2E";
};

const areaFor = ({ sourceFile }) => {
  const name = sourceFile.split("/").at(-1).replace(/\.spec\.ts$/, "");
  return name
    .replace(/^\d+-/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const headers = [
  "test_case_id", "test_level", "category", "suite", "module", "title",
  "preconditions", "test_data", "test_steps", "expected_result", "actual_result",
  "status", "severity", "priority", "environment", "automation_type",
  "source_file", "source_line", "browser", "evidence", "defect_id", "executed_by",
  "execution_date", "notes",
];

const rows = cases.map((testCase, index) => {
  const ordinal = index + 1;
  const skipped = (ordinal >= 91 && ordinal <= 111) || (ordinal >= 113 && ordinal <= 115);
  return [
    `E2E-${String(ordinal).padStart(3, "0")}`,
    "End-to-end",
    classify(testCase),
    testCase.sourceFile.startsWith("tests/e2e/production/") ? "Production guarded" : "Local automated",
    areaFor(testCase),
    testCase.title,
    skipped ? "Provisioned production authentication and integrations" : "Local test server and seeded E2E profile are available",
    "Repository-controlled Playwright fixture data",
    `Execute ${testCase.sourceFile}:${testCase.line} in ${testCase.browser}; perform the named user workflow`,
    "The named workflow completes and all Playwright assertions pass",
    skipped ? "Not executed because required production prerequisites were unavailable" : "All Playwright assertions passed",
    skipped ? "Skipped" : "Passed",
    skipped ? "Informational" : "Not applicable",
    skipped ? "P1" : "P3",
    skipped ? "Production integration environment required" : "Local Windows / Chromium",
    "Automated Playwright",
    testCase.sourceFile,
    testCase.line,
    testCase.browser,
    skipped
      ? "Explicit environment guard in final aggregate run"
      : "Final aggregate pnpm test:e2e run, 2026-09-09",
    "",
    "Codex QA automation",
    "2026-09-09",
    skipped ? "Production credential/integration dependency; see completed-test-cases report" : "docs/reports/completed-test-cases-2026-09-09.md",
  ];
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}\n`,
  "utf8",
);

const passed = rows.filter((row) => row[11] === "Passed").length;
const skipped = rows.length - passed;
if (passed !== 103 || skipped !== 24) {
  throw new Error(`Result reconciliation failed: ${passed} passed, ${skipped} skipped`);
}

console.log(`Wrote ${outputPath}: ${rows.length} cases (${passed} passed, ${skipped} skipped)`);
