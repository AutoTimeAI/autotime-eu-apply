import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("supabase/migrations/20260912280000_evidence_gated_expert_signoff.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-experts/signoffs/route.ts", "utf8")

test("only an active owner can record an external expert sign-off", () => {
  assert.match(source, /status = 'active' and role = 'owner'/i)
  assert.match(source, /recorded_by uuid references auth\.users/i)
  assert.match(source, /mobility_expert_signoff_recorded/i)
})

test("the owner endpoint requires same-origin confirmation and a bounded review window", () => {
  assert.match(route, /mobility_experts:record/)
  assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /Date\.parse\(value\.reviewBy\) <= Date\.parse\(value\.effectiveFrom\)/)
})

test("sign-off requires approved critical claims and accepted archived captures", () => {
  assert.match(source, /claim\.state <> 'approved'/i)
  assert.match(source, /accepted_for_claim_review/i)
  assert.match(source, /critical source captures are missing acceptance/i)
})

test("every required evaluation must pass in the exact named run", () => {
  assert.match(source, /unnest\(bundle\.evaluation_case_ids\)/i)
  assert.match(source, /result\.run_id = p_test_run_id/i)
  assert.match(source, /result\.passed/i)
})

test("recording sign-off does not activate a bundle or readiness snapshot", () => {
  assert.doesNotMatch(source, /insert into public\.mobility_rule_bundle_activations/i)
  assert.doesNotMatch(source, /insert into public\.mobility_country_readiness_snapshots/i)
})
