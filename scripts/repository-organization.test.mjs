import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("Playwright configurations keep regenerable output under artifacts", async () => {
  const [full, smoke, design] = await Promise.all([
    read("playwright.config.ts"),
    read("playwright.smoke.config.ts"),
    read("playwright.design.config.ts")
  ])

  assert.match(full, /outputDir: "artifacts\/playwright\/full\/test-results"/)
  assert.match(full, /outputFolder: "artifacts\/playwright\/full\/report"/)
  assert.match(smoke, /outputDir: "artifacts\/playwright\/smoke\/test-results"/)
  assert.match(smoke, /outputFolder: "artifacts\/playwright\/smoke\/report"/)
  assert.match(design, /outputDir: "artifacts\/playwright\/design\/test-results"/)
})

test("live coverage tools share one ignored artifact boundary", async () => {
  const sources = await Promise.all([
    read("scripts/verify-platform-coverage-live.mjs"),
    read("scripts/verify-ats-field-maps-live.mjs"),
    read("scripts/apply-coverage-verification.mjs")
  ])

  for (const source of sources) {
    assert.match(source, /artifacts\/coverage/)
    assert.doesNotMatch(source, /["']coverage-report\//)
  }
})

test("CI uploads the canonical browser and coverage artifact paths", async () => {
  const workflows = await Promise.all([
    "e2e-full.yml",
    "e2e.yml",
    "unit-tests.yml",
    "production-smoke.yml",
    "visual-regression.yml",
    "platform-coverage.yml",
    "ats-field-maps.yml"
  ].map((name) => read(`.github/workflows/${name}`)))

  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, /path:\s*playwright-report\//)
    assert.doesNotMatch(workflow, /path:\s*coverage-report\//)
  }
})

test("artifact contents are ignored while their ownership README stays tracked", async () => {
  const ignore = await read(".gitignore")
  assert.match(ignore, /^artifacts\/\*$/m)
  assert.match(ignore, /^!artifacts\/README\.md$/m)
})

