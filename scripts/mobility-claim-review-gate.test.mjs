import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const source = fs.readFileSync("supabase/migrations/20260912290000_evidence_gated_claim_review.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-claims/approve-successor/route.ts", "utf8")

test("claim review appends an approved successor instead of mutating history", () => {
  assert.match(source, /prior\.version \+ 1/i)
  assert.match(source, /'approved'.*prior\.effective_from/s)
  assert.match(source, /predecessor_version_id/i)
  assert.match(source, /before update or delete on public\.mobility_claim_reviews/i)
  assert.doesNotMatch(source, /update public\.mobility_claim_versions/i)
})
test("the claim-review endpoint requires owner permission, same origin and confirmation", () => {
  assert.match(route, /mobility_claims:review/)
  assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /new Set\(body\.sourceSpanIds\)/)
})
test("every approved claim source span requires an accepted archived capture", () => {
  assert.match(source, /unnest\(p_source_span_ids\)/i)
  assert.match(source, /review\.decision = 'accepted_for_claim_review'/i)
  assert.match(source, /source spans lack accepted captures/i)
})
test("only the owner records the qualified reviewer and signature", () => {
  assert.match(source, /status = 'active' and role = 'owner'/i)
  assert.match(source, /qualification_basis/i)
  assert.match(source, /signature_reference/i)
  assert.match(source, /mobility_claim_reviewed/i)
})
