import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync(
  "supabase/migrations/20260912230000_enforce_decision_evidence_lineage.sql",
  "utf8",
)

test("new decisions materialise their rule bundle claim and source lineage", () => {
  assert.match(source, /after insert on public\.mobility_decision_records/i)
  assert.match(source, /insert into public\.mobility_decision_evidence_links/i)
  assert.match(source, /public\.mobility_rule_claim_links/i)
  assert.match(source, /public\.mobility_claim_source_spans/i)
  assert.match(source, /rule_claim\.rule_bundle_version_id = new\.rule_bundle_version_id/i)
})

test("a governed decision fails closed when its bundle has no source evidence", () => {
  assert.match(source, /if linked_count = 0 then/i)
  assert.match(source, /governed mobility decision requires claim-to-source evidence lineage/i)
  assert.match(source, /errcode = '23514'/i)
})

test("lineage attachment is privileged narrowly and stores references only", () => {
  assert.match(source, /security definer/i)
  assert.match(source, /set search_path = ''/i)
  assert.match(source, /revoke all on function public\.attach_mobility_decision_evidence_lineage\(\) from public, anon, authenticated/i)
  assert.doesNotMatch(source, /exact_text|statement|canonical_output/i)
})
