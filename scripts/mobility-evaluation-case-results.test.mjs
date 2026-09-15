import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const path =
  "supabase/migrations/20260912200000_mobility_evaluation_case_results.sql"
const source = fs.readFileSync(path, "utf8")

test("results table is append-only like the rest of the evidence registry", () => {
  assert.match(source, /before update or delete on public\.mobility_rule_bundle_evaluation_results/i)
  assert.match(source, /execute function public\.reject_mobility_immutable_mutation/i)
  assert.match(source, /revoke all on public\.mobility_rule_bundle_evaluation_results from anon, authenticated/i)
})

test("a result is uniquely identified by version, case and run", () => {
  assert.match(source, /unique \(rule_bundle_version_id, case_id, run_id\)/i)
})

test("activation enforcement now also requires a passing result per required case", () => {
  assert.match(source, /create or replace function public\.enforce_mobility_rule_bundle_activation/i)
  assert.match(source, /select rbv\.evaluation_case_ids into required_case_ids/i)
  assert.match(source, /from unnest\(required_case_ids\) as required\(case_id\)/i)
  assert.match(source, /and r\.passed/i)
  assert.match(source, /missing_case_count > 0/i)
})

test("a result passing against one bundle version does not satisfy a different version", () => {
  assert.match(source, /r\.rule_bundle_version_id = new\.predecessor_version_id/i)
})
