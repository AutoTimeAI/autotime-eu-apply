import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8")
}

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("billing lock migration removes client-side subscription and usage writes", () => {
  const migration = read(
    "supabase/migrations/20260508100000_lock_billing_server_writes.sql"
  )

  assert.match(
    migration,
    /drop policy if exists "subscriptions_update_own" on public\.subscriptions;/i
  )
  assert.match(
    migration,
    /drop policy if exists "ai_usage_insert_own" on public\.ai_usage;/i
  )
})

test("Stripe webhook awaits server-side subscription processing", () => {
  const route = read("apps/web/app/api/stripe/webhook/route.ts")

  assert.match(route, /await handleStripeEvent\(event\)/)
  assert.doesNotMatch(route, /void handleStripeEvent\(event\)\.catch/)
})

test("environment templates keep development and production credentials separated", () => {
  const localTemplate = read(".env.local.example")
  const productionTemplate = read(".env.production.example")

  assert.match(localTemplate, /NEXT_PUBLIC_AUTOTIME_ENV=development/)
  assert.match(localTemplate, /pk_test_/)
  assert.match(localTemplate, /sk_test_/)
  assert.doesNotMatch(localTemplate, /pk_live_/)
  assert.doesNotMatch(localTemplate, /sk_live_/)

  assert.match(productionTemplate, /NEXT_PUBLIC_AUTOTIME_ENV=production/)
  assert.match(productionTemplate, /pk_live_/)
  assert.match(productionTemplate, /sk_live_/)
  assert.doesNotMatch(productionTemplate, /pk_test_/)
  assert.doesNotMatch(productionTemplate, /sk_test_/)
})

test("CI builds the web dashboard with non-production placeholder secrets", () => {
  const workflow = read(".github/workflows/unit-tests.yml")

  assert.match(workflow, /NEXT_PUBLIC_AUTOTIME_ENV: preview/)
  assert.match(workflow, /STRIPE_SECRET_KEY: sk_test_offline_ci/)
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL: https:\/\/example\.supabase\.co/)
})

test("AI rate-limit RPC uses timestamptz reset values", () => {
  const migration = read(
    "supabase/migrations/20260514120000_fix_ai_rate_limit_timestamp.sql"
  )

  assert.match(migration, /current_timestamp_at timestamptz := now\(\);/)
  assert.match(
    migration,
    /current_timestamp_at \+ make_interval\(secs => p_window_seconds\)/
  )
  assert.doesNotMatch(migration, /current_time timestamptz/)
})

test("profile sync stores one current profile record per user", () => {
  const migration = read("supabase/migrations/20260506171000_cloud_sync_profiles.sql")
  const cloudSync = read("apps/web/lib/cloud-sync.ts")

  assert.match(migration, /create table if not exists public\.profiles/i)
  assert.match(migration, /constraint profiles_user_unique unique \(user_id\)/i)
  assert.match(migration, /alter table public\.profiles enable row level security/i)
  assert.match(cloudSync, /\.upsert\(payloadResult\.payload, \{ onConflict: "user_id" \}\)/)
})

test("profile CV AI review validates input before quota checks", () => {
  const routes = [
    "apps/web/app/api/ai/analyse/route.ts",
    "apps/web/app/api/ai/content/route.ts",
    "apps/web/app/api/ai/interview/route.ts",
    "apps/web/app/api/ai/interview-answer/route.ts",
    "apps/web/app/api/ai/profile-context/route.ts"
  ]

  for (const routePath of routes) {
    const route = read(routePath)
    const parseIndex = route.indexOf("const body = requestSchema.parse")
    const rateLimitIndex = route.indexOf("await assertAiRouteRateLimit")
    const featureGateIndex = route.indexOf("await assertCanUseAi")

    assert.notEqual(parseIndex, -1, routePath)
    assert.notEqual(rateLimitIndex, -1, routePath)
    assert.notEqual(featureGateIndex, -1, routePath)
    assert.ok(parseIndex < rateLimitIndex, routePath)
    assert.ok(parseIndex < featureGateIndex, routePath)
  }
})

test("profile CV AI review handles upgrade limits before generic errors", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const upgradeIndex = dashboard.indexOf('body.data && "upgradeUrl" in body.data')
  const errorIndex = dashboard.indexOf("!response.ok || !body.data || body.error")

  assert.notEqual(upgradeIndex, -1)
  assert.notEqual(errorIndex, -1)
  assert.ok(upgradeIndex < errorIndex)
})

test("AI review schemas accept list fields as string or array", () => {
  const openaiServer = read("apps/web/lib/openai-server.ts")
  const interviewPrep = read("apps/web/lib/interview-prep.ts")
  const route = read("apps/web/app/api/ai/profile-context/route.ts")

  assert.match(
    openaiServer,
    /z\s*\.\s*union\(\[z\.string\(\), z\.array\(z\.string\(\)\)\]\)/
  )
  assert.match(openaiServer, /normaliseStringList/)
  assert.match(openaiServer, /renderTargetRoles\(value\.targetRoles\)/)
  assert.match(openaiServer, /scoreFactors: stringListSchema/)
  assert.match(openaiServer, /likelyQuestions: stringListSchema/)
  assert.match(openaiServer, /riskFlags: stringListSchema/)
  assert.match(interviewPrep, /typeof value !== "string"/)
  assert.match(route, /getValidationIssueMessage/)
  assert.match(read("apps/web/lib/diagnostics.ts"), /getValidationIssueMessage/)
})

test("CV profile detail extraction stays conservative", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /function inferCandidateDetailsFromResume/)
  assert.match(dashboard, /roleTitleKeywords/)
  assert.match(dashboard, /!includesAny\(line, roleTitleKeywords\)/)
  assert.match(dashboard, /currentCountry = locationLine/)
  assert.match(dashboard, /currentProfile\.fullName\.trim\(\)/)
  assert.match(dashboard, /inferredDetails\.fullName/)
  assert.match(dashboard, /canUseInferredCurrentCountry/)
  assert.doesNotMatch(dashboard, /gender|ethnicity|marital|nationality|dateOfBirth/i)
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
