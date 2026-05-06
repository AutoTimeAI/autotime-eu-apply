import assert from "node:assert/strict"
import { getCloudSyncReadiness } from "../lib/cloud-sync.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("keeps cloud sync local when feature flag is off", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "false",
    supabaseUrl: "",
    supabaseAnonKey: ""
  })

  assert.equal(readiness.enabled, false)
  assert.equal(readiness.configured, false)
  assert.equal(readiness.modeLabel, "Local only")
  assert.equal(readiness.accountLabel, "Sign-in locked")
  assert.equal(readiness.syncActionLabel, "Keep local evidence")
  assert.deepEqual(readiness.issues, [
    "cloud sync feature flag is off",
    "Supabase URL is missing",
    "Supabase anon key is missing"
  ])
})

test("marks cloud sync flagged when env is incomplete", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: ""
  })

  assert.equal(readiness.enabled, true)
  assert.equal(readiness.configured, false)
  assert.equal(readiness.modeLabel, "Flagged")
  assert.equal(readiness.accountLabel, "Sign-in locked")
  assert.equal(readiness.syncActionLabel, "Keep local evidence")
  assert.deepEqual(readiness.issues, ["Supabase anon key is missing"])
})

test("marks cloud sync ready only when public env is present", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-anon-key"
  })

  assert.equal(readiness.enabled, true)
  assert.equal(readiness.configured, true)
  assert.equal(readiness.modeLabel, "Ready for auth wiring")
  assert.equal(readiness.accountLabel, "Auth wiring ready")
  assert.equal(readiness.syncActionLabel, "Connect account next")
  assert.deepEqual(readiness.issues, [])
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
