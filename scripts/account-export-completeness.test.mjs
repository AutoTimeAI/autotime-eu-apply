import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// Static-inspection test: a per-table read failure in the GDPR Article 20
// account export must never be silently swallowed into an empty array with
// no record anywhere that the table was skipped - see the 2026-09-19
// docs/quality-assurance.md entry for the incident this closes.
const source = readFileSync(
  new URL("../apps/web/app/api/account/export/route.ts", import.meta.url),
  "utf8",
)

const tests = []
function test(name, run) {
  tests.push({ name, run })
}

test("a per-table export error is logged, not silently dropped", () => {
  assert.match(source, /logDiagnostic\(/)
  assert.match(source, /account\.export\.table-read-failed/)
})

test("a per-table export error is surfaced in the response payload", () => {
  assert.match(source, /incompleteTables/)
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
if (failed > 0) process.exitCode = 1
