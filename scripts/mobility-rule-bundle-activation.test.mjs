import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const path =
  "supabase/migrations/20260912190000_enforce_mobility_rule_bundle_activation.sql"
const source = fs.readFileSync(path, "utf8")

test("activation enforcement fires before insert, not update or delete", () => {
  assert.match(source, /before insert on public\.mobility_rule_bundle_versions/i)
  assert.doesNotMatch(source, /before update.*mobility_rule_bundle_versions.*enforce_mobility_rule_bundle_activation/i)
})

test("first version can never activate directly", () => {
  assert.match(source, /new\.version = 1 or new\.predecessor_version_id is null/i)
})

test("activation requires at least one critical claim linked to the predecessor", () => {
  assert.match(source, /critical_claim_count = 0/i)
  assert.match(source, /l\.rule_bundle_version_id = new\.predecessor_version_id/i)
  assert.match(source, /l\.critical/i)
})

test("activation requires every linked critical claim to be approved", () => {
  assert.match(source, /cv\.state <> 'approved'/i)
  assert.match(source, /unapproved_critical_claims > 0/i)
})

test("activation requires an unexpired approving expert sign-off", () => {
  assert.match(source, /decision in \('approved', 'approved_with_conditions'\)/i)
  assert.match(source, /s\.review_by > now\(\)/i)
  assert.match(source, /valid_signoff_count = 0/i)
})

test("enforcement function is locked down like the existing immutability trigger", () => {
  assert.match(source, /security invoker/i)
  assert.match(source, /set search_path = ''/i)
  assert.match(source, /revoke all on function public\.enforce_mobility_rule_bundle_activation\(\) from public, anon, authenticated/i)
})
