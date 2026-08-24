import assert from "node:assert/strict"
import { parseContentSnapshot } from "../lib/dashboard-content-snapshot.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const validSnapshot = {
  coverLetter: "Dear hiring manager...",
  profileSummary: "Experienced analyst.",
  motivationAnswer: "I am motivated because...",
  strengthsAnswer: "My strengths are...",
  availabilityAnswer: "Available in one month.",
  savedAt: "2026-08-19T00:00:00.000Z",
}

test("returns undefined for a null content_snapshot", () => {
  assert.equal(parseContentSnapshot("app-1", null), undefined)
})

test("returns undefined for an undefined content_snapshot", () => {
  assert.equal(parseContentSnapshot("app-1", undefined), undefined)
})

test("parses a fully-populated content_snapshot", () => {
  const result = parseContentSnapshot("app-1", validSnapshot)
  assert.deepEqual(result, validSnapshot)
})

test("drops an empty-object content_snapshot instead of throwing", () => {
  const result = parseContentSnapshot("app-1", {})
  assert.equal(result, undefined)
})

test("drops a partially-populated content_snapshot instead of throwing", () => {
  const result = parseContentSnapshot("app-1", {
    coverLetter: "Dear hiring manager...",
    profileSummary: "Experienced analyst.",
  })
  assert.equal(result, undefined)
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
