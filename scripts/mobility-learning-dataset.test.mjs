import assert from "node:assert/strict"
import test from "node:test"
import { assembleLearningEvaluationCases } from "../packages/shared/src/evidence/learning-dataset.ts"
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const assignment = { id: id(1), userId: id(2), consentId: id(3), variant: "treatment", assignedAt: "2026-09-01T00:00:00.000Z" }
const observation = (decisionId) => ({ decisionId, userId: id(2), recommendedAction: "apply", expertSafe: true, userUnderstood: true })
const event = (decisionId, eventType, occurredAt, correctionId = null) => ({ consentId: id(3), decisionId, eventType, occurredAt, correctionId })

test("one assignment contributes exactly one deterministic post-assignment decision", () => {
  const cases = assembleLearningEvaluationCases({ assignments: [assignment], observations: [observation(id(10)), observation(id(11))], events: [event(id(11), "applied", "2026-09-03T00:00:00.000Z"), event(id(10), "decision_viewed", "2026-09-02T00:00:00.000Z")], correctionReviews: [], validConsentIdsAtCutoff: [id(3)], datasetCutoffAt: "2026-09-10T00:00:00.000Z" })
  assert.equal(cases.length, 1); assert.equal(cases[0].decisionId, id(10))
})

test("cutoff, ownership and consent identity exclude ineligible events", () => {
  const cases = assembleLearningEvaluationCases({ assignments: [assignment], observations: [observation(id(10))], events: [{ ...event(id(10), "applied", "2026-09-11T00:00:00.000Z") }], correctionReviews: [], validConsentIdsAtCutoff: [id(3)], datasetCutoffAt: "2026-09-10T00:00:00.000Z" })
  assert.deepEqual(cases, [])
})

test("bounded events derive action, outcome and reviewed correction state", () => {
  const correctionId = id(20)
  const cases = assembleLearningEvaluationCases({ assignments: [assignment], observations: [observation(id(10))], events: [event(id(10), "applied", "2026-09-02T00:00:00.000Z"), event(id(10), "offer", "2026-09-04T00:00:00.000Z"), event(id(10), "correction_submitted", "2026-09-03T00:00:00.000Z", correctionId)], correctionReviews: [{ correctionId, decision: "accepted", reviewedAt: "2026-09-05T00:00:00.000Z" }], validConsentIdsAtCutoff: [id(3)], datasetCutoffAt: "2026-09-10T00:00:00.000Z" })
  assert.equal(cases[0].observedAction, "applied"); assert.equal(cases[0].outcome, "offer"); assert.equal(cases[0].correctionOutcome, "accepted")
})

test("withdrawn consent preserves the case but excludes it from metrics", () => {
  const cases = assembleLearningEvaluationCases({ assignments: [assignment], observations: [observation(id(10))], events: [event(id(10), "decision_viewed", "2026-09-02T00:00:00.000Z")], correctionReviews: [], validConsentIdsAtCutoff: [], datasetCutoffAt: "2026-09-10T00:00:00.000Z" })
  assert.equal(cases[0].consentValid, false)
})

test("comprehension comes only from the latest consent-linked response before cutoff", () => {
  const cases = assembleLearningEvaluationCases({ assignments: [assignment], observations: [observation(id(10))], events: [event(id(10), "decision_viewed", "2026-09-02T00:00:00.000Z")], correctionReviews: [], validConsentIdsAtCutoff: [id(3)], datasetCutoffAt: "2026-09-10T00:00:00.000Z", comprehensionResponses: [{ decisionId: id(10), consentId: id(3), understood: false, respondedAt: "2026-09-03T00:00:00.000Z" }, { decisionId: id(10), consentId: id(3), understood: true, respondedAt: "2026-09-04T00:00:00.000Z" }] })
  assert.equal(cases[0].userUnderstood, true)
})
