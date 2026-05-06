import assert from "node:assert/strict"
import {
  createCloudSyncClient,
  getCloudSyncSessionState,
  getCloudSyncReadiness
} from "../lib/cloud-sync.ts"

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

test("does not create a Supabase client until readiness is complete", () => {
  const result = createCloudSyncClient({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: ""
  })

  assert.equal(result.ready, false)
  assert.equal(result.client, null)
  assert.equal(result.readiness.modeLabel, "Flagged")
})

test("creates a guarded Supabase client when public env is ready", () => {
  const result = createCloudSyncClient({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-anon-key"
  })

  assert.equal(result.ready, true)
  assert.ok(result.client)
  assert.equal(result.readiness.modeLabel, "Ready for auth wiring")
})

test("blocks session checks until cloud sync client is ready", async () => {
  const result = createCloudSyncClient({
    enabled: "false",
    supabaseUrl: "",
    supabaseAnonKey: ""
  })
  const session = await getCloudSyncSessionState(result)

  assert.equal(session.checked, false)
  assert.equal(session.authenticated, false)
  assert.equal(
    session.message,
    "Session check blocked until cloud-sync readiness is complete."
  )
})

test("reads authenticated session from a ready client adapter", async () => {
  const session = await getCloudSyncSessionState({
    ready: true,
    client: {
      auth: {
        getSession: async () => ({
          data: {
            session: {
              user: {
                email: "pilot@example.com"
              }
            }
          },
          error: null
        })
      }
    }
  })

  assert.equal(session.checked, true)
  assert.equal(session.authenticated, true)
  assert.equal(session.userEmail, "pilot@example.com")
  assert.equal(
    session.message,
    "Authenticated session detected. Profile sync still requires explicit user action."
  )
})

test("returns a safe unauthenticated state when no session exists", async () => {
  const session = await getCloudSyncSessionState({
    ready: true,
    client: {
      auth: {
        getSession: async () => ({
          data: { session: null },
          error: null
        })
      }
    }
  })

  assert.equal(session.checked, true)
  assert.equal(session.authenticated, false)
  assert.equal(session.userEmail, null)
  assert.equal(session.message, "No authenticated session detected.")
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
