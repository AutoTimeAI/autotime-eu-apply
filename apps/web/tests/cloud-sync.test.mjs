// Lightweight node:assert unit test (no test runner/framework) for
// lib/cloud-sync.ts, the module that decides whether/how a user's profile
// may sync to the cloud. Covers the readiness ladder from feature flag off
// through incomplete env config to fully ready, that a Supabase client is
// never constructed before readiness is complete, reading session state
// safely from a client adapter, building a sync payload restricted to
// allowed profile fields (dropping stray keys like apiKey/cookie) and only
// once mandatory bridge evidence is present, and that a sync action stays
// blocked until readiness, an authenticated session, explicit user action
// and consent are all satisfied together.
import assert from "node:assert/strict"
import {
  createCloudSyncClient,
  createProfileSyncPayload,
  prepareProfileSyncAction,
  getCloudSyncSessionState,
  getCloudSyncReadiness,
  getBrowserCloudSyncReadiness
} from "../lib/cloud-sync.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const completeProfile = {
  fullName: " Rajan Patel ",
  email: "rajan@example.com",
  phone: "",
  linkedInUrl: "https://www.linkedin.com/in/rajan",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: " United Kingdom ",
  currentCity: "London",
  targetCountries: "United Kingdom, Ireland",
  targetRoles: "Business Analyst, Systems Analyst",
  workRightDetails: "UK work authorisation",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "Negotiable",
  baseCvText: "Business analyst with payments, UAT and SQL evidence.",
  projectSummaries: "",
  experienceHighlights: "Requirements, UAT, stakeholder management."
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
  assert.equal(readiness.syncActionLabel, "Sync profile")
  assert.deepEqual(readiness.issues, [])
})

test("enables browser cloud sync by default in production builds", () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousAutoTimeEnv = process.env.NEXT_PUBLIC_AUTOTIME_ENV
  const previousEnabled = process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED
  const previousLocalOnly = process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previousSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    process.env.NODE_ENV = "production"
    delete process.env.NEXT_PUBLIC_AUTOTIME_ENV
    delete process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED
    delete process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key"

    const readiness = getBrowserCloudSyncReadiness()

    assert.equal(readiness.enabled, true)
    assert.equal(readiness.configured, true)
    assert.deepEqual(readiness.issues, [])
  } finally {
    process.env.NODE_ENV = previousNodeEnv
    process.env.NEXT_PUBLIC_AUTOTIME_ENV = previousAutoTimeEnv
    process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED = previousEnabled
    process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY = previousLocalOnly
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnonKey
  }
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

test("creates a profile sync payload from mandatory bridge evidence", () => {
  const result = createProfileSyncPayload({
    profile: completeProfile,
    userId: " user-123 "
  })

  assert.equal(result.ready, true)
  assert.equal(result.payload.user_id, "user-123")
  assert.equal(result.payload.full_name, "Rajan Patel")
  assert.equal(result.payload.current_country, "United Kingdom")
  assert.equal(result.payload.phone, null)
  assert.equal(result.payload.source_surface, "web")
  assert.equal(result.payload.schema_version, 1)
})

test("blocks profile sync payload when mandatory bridge evidence is missing", () => {
  const result = createProfileSyncPayload({
    profile: {
      ...completeProfile,
      workRightDetails: "",
      baseCvText: ""
    },
    userId: "user-123"
  })

  assert.equal(result.ready, false)
  assert.equal(result.payload, null)
  assert.deepEqual(result.issues, ["work-right details", "CV evidence"])
})

test("blocks profile sync payload without authenticated user id", () => {
  const result = createProfileSyncPayload({
    profile: completeProfile,
    userId: ""
  })

  assert.equal(result.ready, false)
  assert.deepEqual(result.issues, ["authenticated user id"])
})

test("keeps profile sync payload limited to allowed profile fields", () => {
  const result = createProfileSyncPayload({
    profile: {
      ...completeProfile,
      apiKey: "secret-key",
      cookie: "session-cookie"
    },
    userId: "user-123"
  })

  assert.equal(result.ready, true)
  assert.equal(Object.hasOwn(result.payload, "apiKey"), false)
  assert.equal(Object.hasOwn(result.payload, "cookie"), false)
})

test("blocks profile sync action without readiness, session and click", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "false",
    supabaseUrl: "",
    supabaseAnonKey: ""
  })
  const result = prepareProfileSyncAction({
    readiness,
    session: {
      checked: false,
      authenticated: false,
      userEmail: null,
      message: "Session not checked"
    },
    profile: completeProfile,
    explicitUserAction: false,
    consentGranted: false
  })

  assert.equal(result.ready, false)
  assert.deepEqual(result.blockers, [
    "cloud-sync readiness is incomplete",
    "authenticated session is missing",
    "explicit user sync action is required",
    "cloud sync consent is required",
    "authenticated user id"
  ])
})

test("blocks profile sync action without consent", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-anon-key"
  })
  const result = prepareProfileSyncAction({
    readiness,
    session: {
      checked: true,
      authenticated: true,
      userEmail: "pilot@example.com",
      message: "Authenticated session detected"
    },
    profile: completeProfile,
    explicitUserAction: true,
    consentGranted: false
  })

  assert.equal(result.ready, false)
  assert.deepEqual(result.blockers, ["cloud sync consent is required"])
})

test("prepares profile sync action only after readiness, session, consent and click", () => {
  const readiness = getCloudSyncReadiness({
    enabled: "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-anon-key"
  })
  const result = prepareProfileSyncAction({
    readiness,
    session: {
      checked: true,
      authenticated: true,
      userEmail: "pilot@example.com",
      message: "Authenticated session detected"
    },
    profile: completeProfile,
    explicitUserAction: true,
    consentGranted: true
  })

  assert.equal(result.ready, true)
  assert.equal(result.payload.user_id, "pilot@example.com")
  assert.equal(
    result.message,
    "Profile sync payload is ready for authenticated upload."
  )
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
