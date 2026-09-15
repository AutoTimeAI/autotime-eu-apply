import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const migration = fs.readFileSync("supabase/migrations/20260912320000_record_executable_rule_evaluation.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-rules/evaluate/route.ts", "utf8")
const registerRoute = fs.readFileSync("apps/web/app/api/admin/mobility-fixtures/register/route.ts", "utf8")
test("a run must contain every required case exactly once", () => {
  assert.match(migration, /missing_count/i); assert.match(migration, /extra_count/i); assert.match(migration, /duplicate_count/i)
  assert.match(migration, /each required case exactly once/i)
})
test("results identify the deterministic evaluator and remain append-only", () => {
  assert.match(migration, /autotime-rule-dsl-v1/); assert.match(migration, /mobility_rule_bundle_evaluation_results/)
  assert.match(migration, /mobility_rule_evaluation_recorded/)
})
test("fixture sets are immutable, hashed, and bound to result rows", () => {
  assert.match(migration, /create table public\.mobility_evaluation_fixture_sets/i)
  assert.match(migration, /before update or delete on public\.mobility_evaluation_fixture_sets/i)
  assert.match(migration, /fixture_set_id uuid references/i)
  assert.match(migration, /fixtureSetSha256/i)
  assert.match(registerRoute, /createHash\("sha256"\)/)
  assert.match(registerRoute, /Fixture case identifiers must be unique/)
})
test("the owner endpoint executes rules before recording results", () => {
  assert.match(route, /mobility_rules:evaluate/); assert.match(route, /evaluateMobilityRuleCase/)
  assert.match(route, /isSameOriginMutation/); assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /mobility_evaluation_fixture_sets/)
})
