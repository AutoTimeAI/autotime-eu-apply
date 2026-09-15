import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const source = fs.readFileSync("supabase/seeds/mobility_de_nl_review_seed.sql", "utf8")
test("review seed is explicitly non-production and non-approved", () => {
  assert.match(source, /NON-PRODUCTION review seed/i)
  assert.doesNotMatch(source, /insert into public\.mobility_expert_signoffs/i)
  assert.doesNotMatch(source, /insert into public\.mobility_rule_bundle_activations/i)
  assert.equal((source.match(/'review_required'/g) ?? []).length, 8)
  assert.equal((source.match(/'information_only'/g) ?? []).length, 4)
})
test("Germany and Netherlands seed exact claim and evaluation identifiers", () => {
  for (const id of ['DE-002','DE-LAW-002','DE-LAW-003','NL-001','NL-002','NL-REG-001','DE-BOUNDARY-001','DE-NEG-001','DE-ICT-001','NL-SPONSOR-001','NL-SPONSOR-002']) assert.match(source, new RegExp(id))
})
test("placeholder captures cannot be mistaken for real archives", () => {
  assert.equal((source.match(/local-seed:\/\/not-a-source-capture/g) ?? []).length, 5)
  assert.equal((source.match(/"realSourceCapture":false/g) ?? []).length, 2)
})
