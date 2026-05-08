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
