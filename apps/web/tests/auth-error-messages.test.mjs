import assert from "node:assert/strict"
import {
  fallbackAuthErrorMessage,
  getAuthErrorMessage
} from "../lib/auth-error-messages.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("maps the PKCE code-verifier failure to actionable, non-technical copy", () => {
  const message = getAuthErrorMessage("exchange-code")
  assert.match(message, /same browser/i)
  assert.doesNotMatch(message, /PKCE/i)
  assert.doesNotMatch(message, /@supabase/i)
})

test("maps every other known stage away from raw SDK text", () => {
  for (const stage of ["provider-error", "missing-code", "read-user", "session-exchange"]) {
    assert.equal(typeof getAuthErrorMessage(stage), "string")
    assert.ok(getAuthErrorMessage(stage).length > 0)
  }
})

test("falls back to the generic message for an unknown stage", () => {
  assert.equal(getAuthErrorMessage("unknown"), fallbackAuthErrorMessage)
  assert.equal(getAuthErrorMessage(""), fallbackAuthErrorMessage)
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
