import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { crossCheckExecutableRules } from "../apps/web/platform/application-preparation/decision-adapter.ts"

const adapter = await readFile(new URL("../apps/web/platform/application-preparation/decision-adapter.ts", import.meta.url), "utf8")
const repository = await readFile(new URL("../apps/web/platform/application-preparation/mobility-governance-repository.ts", import.meta.url), "utf8")
const writer = await readFile(new URL("../apps/web/platform/application-preparation/mobility-decision-writer.ts", import.meta.url), "utf8")

test("live governed decisions execute the immutable bundle selected by readiness", () => {
  assert.match(repository, /mobility_rule_bundle_versions!rule_bundle_version_id\(rules\)/)
  assert.match(adapter, /evaluateMobilityRuleCase\(rules/)
  assert.match(adapter, /caseId: "live-decision-cross-check"/)
})

test("missing or disagreeing executable rules fail closed with explicit codes", () => {
  assert.match(adapter, /EXECUTABLE_RULES_UNAVAILABLE/)
  assert.match(adapter, /LIVE_RULE_ENGINE_MISMATCH/)
  assert.match(adapter, /outputPermission: "blocked"/)
  assert.match(adapter, /decision: "Insufficient evidence"/)
})

test("the cross-check uses raw decision facts rather than the final label alone", () => {
  for (const fact of ["fitScore", "sponsorshipNeeded", "pathwayStatus", "supportLevel", "confirmedBlockerCount", "missingEvidenceCount", "stamp4Verified"])
    assert.match(adapter, new RegExp(`${fact}[:,]`))
})

const international = {
  pathwayStatus: "potentially-supported",
  supportLevel: "full",
  confirmedBlockers: [],
  missingEvidence: [],
  stamp4Verified: false,
}
const bundle = (outcome) => ({
  formatVersion: 1,
  rules: [{ id: "fit-threshold", all: [{ fact: "fitScore", operator: "gte", value: 65 }], outcome }],
  defaultOutcome: "insufficient_evidence",
})
const input = {
  combinedDecision: "Apply",
  fitScore: 80,
  international,
  sponsorshipNeeded: true,
  targetCountry: "Ireland",
}

test("matching executable policy independently confirms the live decision", () => {
  const result = crossCheckExecutableRules({ ...input, rules: bundle("potential_match") })
  assert.equal(result.passed, true)
  assert.equal(result.reasonCode, null)
  const { evaluatedFacts, ...evaluation } = result.evaluation
  assert.equal(evaluatedFacts.fitScore, 80)
  assert.deepEqual(evaluation, {
    expectedState: "potential_match",
    actualState: "potential_match",
    matchedRuleId: "fit-threshold",
    passed: true,
  })
})

test("policy disagreement and invalid policy both fail closed", () => {
  const mismatch = crossCheckExecutableRules({ ...input, rules: bundle("not_supported") })
  assert.equal(mismatch.reasonCode, "LIVE_RULE_ENGINE_MISMATCH")
  const { evaluatedFacts: mismatchFacts, ...mismatchEvaluation } = mismatch.evaluation
  assert.equal(mismatchFacts.country, "Ireland")
  assert.deepEqual(mismatchEvaluation, {
    expectedState: "potential_match",
    actualState: "not_supported",
    matchedRuleId: "fit-threshold",
    passed: false,
  })
  const invalid = crossCheckExecutableRules({ ...input, rules: null })
  assert.equal(invalid.reasonCode, "EXECUTABLE_RULES_UNAVAILABLE")
  const { evaluatedFacts: invalidFacts, ...invalidEvaluation } = invalid.evaluation
  assert.equal(invalidFacts.sponsorshipNeeded, true)
  assert.deepEqual(invalidEvaluation, {
    expectedState: "potential_match",
    actualState: null,
    matchedRuleId: null,
    passed: false,
  })
})

test("the immutable canonical receipt includes the executable evaluation trace", () => {
  assert.match(adapter, /executableEvaluation: crossCheck\.evaluation/)
  assert.match(writer, /executableEvaluation: decision\.governance\.executableEvaluation \?\? null/)
  assert.match(writer, /canonicalOutputSha256: sha256\(stable\(canonicalOutput\)\)/)
})
