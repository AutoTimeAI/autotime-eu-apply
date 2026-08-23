import assert from "node:assert/strict"
import { getStatusTone } from "../lib/status-tone.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("classifies a routine session-expired re-auth prompt as a warning, not an error", () => {
  // The generic \bexpired\b entry in the error word list previously matched
  // first (as a substring of "session expired"), before the warning
  // regex - which separately, explicitly lists "session expired" - ever
  // got a chance to run. LoginContent.tsx sets exactly this message on a
  // routine re-auth prompt, not a failure.
  assert.equal(
    getStatusTone("Session expired. Sign in again to continue."),
    "warning",
  )
})

test("still classifies other failure messages as errors", () => {
  assert.equal(getStatusTone("Sign-in failed."), "error")
  assert.equal(getStatusTone("Could not load synced profile"), "error")
  assert.equal(getStatusTone("Unauthorized"), "error")
})

test("classifies success and info messages correctly", () => {
  assert.equal(getStatusTone("Profile saved and synced to dashboard"), "success")
  assert.equal(getStatusTone(null), "info")
  assert.equal(getStatusTone(""), "info")
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
