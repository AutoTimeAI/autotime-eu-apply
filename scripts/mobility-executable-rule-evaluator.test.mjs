import assert from "node:assert/strict"
import test from "node:test"
import { evaluateMobilityRuleCase } from "../packages/shared/src/evidence/index.ts"
const bundle = { formatVersion: 1, rules: [
  { id: "salary-block", all: [{ fact: "salary", operator: "lt", value: 50700 }], outcome: "not_supported" },
  { id: "candidate-pass", all: [{ fact: "salary", operator: "gte", value: 50700 }, { fact: "qualification", operator: "equals", value: true }], outcome: "potential_match" },
], defaultOutcome: "insufficient_evidence" }
test("ordered deterministic rules produce a reproducible passing result", () => {
  const result = evaluateMobilityRuleCase(bundle, { caseId: "DE-1", facts: { salary: 50700, qualification: true }, expectedState: "potential_match" })
  assert.deepEqual(result, { caseId: "DE-1", expectedState: "potential_match", actualState: "potential_match", passed: true, matchedRuleId: "candidate-pass" })
})
test("missing facts fail toward the explicit conservative default", () => {
  assert.equal(evaluateMobilityRuleCase(bundle, { caseId: "DE-2", facts: { salary: 50700 }, expectedState: "insufficient_evidence" }).passed, true)
})
test("unsupported prose and disabled research seeds cannot generate a pass", () => {
  assert.throws(() => evaluateMobilityRuleCase({ mode: "review_seed", automation: "disabled" }, { caseId: "x", facts: {}, expectedState: "potential_match" }))
})
test("numeric operators never coerce strings", () => {
  const result = evaluateMobilityRuleCase(bundle, { caseId: "DE-3", facts: { salary: "60000", qualification: true }, expectedState: "insufficient_evidence" })
  assert.equal(result.passed, true)
})
