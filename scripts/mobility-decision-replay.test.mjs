import assert from "node:assert/strict"
import test from "node:test"
import {
  canonicalDecisionOutput,
  compareDecisionReplay,
  immutableMobilityDecisionSchema
} from "../packages/shared/src/evidence/index.ts"

const decision = (overrides = {}) =>
  immutableMobilityDecisionSchema.parse({
    id: "decision-1",
    userId: "user-1",
    candidateEvidenceVersionIds: ["evidence-2", "evidence-1"],
    vacancySnapshotId: "vacancy-1",
    employerVerificationId: "employer-check-1",
    ruleBundleVersionId: "de-blue-card-v1",
    sourceVersionIds: ["source-2", "source-1"],
    mobilityState: "potential_match",
    employerState: "not_applicable",
    outputPermission: "conditional",
    reasonCodes: ["salary_met", "qualification_review"],
    evidenceLinks: [
      {
        claimVersionId: "claim-2",
        evidenceVersionIds: ["evidence-2"],
        sourceSpanIds: ["span-2"],
        relation: "limits"
      },
      {
        claimVersionId: "claim-1",
        evidenceVersionIds: ["evidence-1"],
        sourceSpanIds: ["span-1"],
        relation: "supports"
      }
    ],
    renderedClaims: ["Salary evidence meets the recorded threshold."],
    recordedAt: "2026-09-12T12:00:00Z",
    ...overrides
  })

test("EU-REPLAY-001 ignores volatile identity and stable-set ordering", () => {
  const original = decision()
  const replayed = decision({
    id: "replay-record-9",
    recordedAt: "2026-09-13T09:00:00Z",
    candidateEvidenceVersionIds: ["evidence-1", "evidence-2"],
    sourceVersionIds: ["source-1", "source-2"],
    reasonCodes: ["qualification_review", "salary_met"],
    evidenceLinks: [...original.evidenceLinks].reverse()
  })

  assert.equal(compareDecisionReplay({ original, replayed }).equivalent, true)
  assert.equal(canonicalDecisionOutput(original), canonicalDecisionOutput(replayed))
})

test("replay detects a changed rule result", () => {
  const result = compareDecisionReplay({
    original: decision(),
    replayed: decision({
      id: "replay-2",
      mobilityState: "not_supported",
      reasonCodes: ["salary_below_threshold"]
    })
  })

  assert.equal(result.equivalent, false)
  assert.notEqual(result.originalCanonical, result.replayCanonical)
})

test("a correction preserves explicit predecessor lineage", () => {
  const corrected = decision({
    id: "decision-2",
    supersedesDecisionId: "decision-1",
    mobilityState: "source_conflict",
    outputPermission: "blocked",
    reasonCodes: ["official_sources_disagree"]
  })

  assert.equal(corrected.supersedesDecisionId, "decision-1")
})

test("a decision cannot omit claims, sources, cases or reasons", () => {
  assert.throws(() => decision({ sourceVersionIds: [] }))
  assert.throws(() => decision({ evidenceLinks: [] }))
  assert.throws(() => decision({ reasonCodes: [] }))
})
