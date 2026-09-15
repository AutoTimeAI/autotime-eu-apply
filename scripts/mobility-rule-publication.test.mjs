import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const source = fs.readFileSync("supabase/migrations/20260912300000_auditable_rule_bundle_current_pointer.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-rules/activate/route.ts", "utf8")
test("current activation is a mutable pointer over immutable version history", () => {
  assert.match(source, /drop index public\.mobility_rule_bundle_one_active_idx/i)
  assert.match(source, /create table public\.mobility_rule_bundle_current/i)
  assert.match(source, /on conflict \(bundle_id\) do update/i)
  assert.doesNotMatch(source, /update public\.mobility_rule_bundle_versions/i)
})
test("the activation endpoint requires owner permission, same origin, and confirmation", () => {
  assert.match(route, /mobility_rules:activate/)
  assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /countryCode\.toUpperCase\(\)/)
})
test("activation creates a successor and preserves claim links", () => {
  assert.match(source, /reviewed\.version \+ 1, 'active'/i)
  assert.match(source, /predecessor_version_id/i)
  assert.match(source, /select activated_version_id, claim_version_id, critical/i)
})
test("publication requires owner and effective expert sign-off", () => {
  assert.match(source, /status = 'active' and role = 'owner'/i)
  assert.match(source, /review_by > p_activated_at/i)
  assert.match(source, /activation requires a currently effective expert sign-off/i)
})
test("publication appends readiness and audit evidence", () => {
  assert.match(source, /insert into public\.mobility_country_readiness_snapshots/i)
  assert.match(source, /mobility_rule_bundle_activated/i)
  assert.match(source, /EXPERT_SIGNOFF_CONDITIONS_APPLY/i)
})
