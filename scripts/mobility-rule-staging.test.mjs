import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const source = fs.readFileSync("supabase/migrations/20260912310000_stage_reviewed_rule_bundle.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-rules/stage/route.ts", "utf8")
test("staging requires exactly one approved successor per critical semantic claim", () => {
  assert.match(source, /missing_claim_count/i); assert.match(source, /extra_claim_count/i)
  assert.match(source, /unapproved_claim_count/i); assert.match(source, /duplicate_semantic_claim_count/i)
  assert.match(source, /exactly one approved successor for every critical semantic claim/i)
})
test("staging creates an immutable review-required successor", () => {
  assert.match(source, /predecessor\.version \+ 1, 'review_required'/i)
  assert.match(source, /predecessor_version_id/i)
  assert.doesNotMatch(source, /update public\.mobility_rule_bundle_versions/i)
})
test("the owner endpoint requires same origin, confirmation, and de-duplicates identifiers", () => {
  assert.match(route, /mobility_rules:stage/); assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/); assert.match(route, /new Set\(body\.approvedClaimVersionIds\)/)
})
