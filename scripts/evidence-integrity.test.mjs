import assert from "node:assert/strict"
import test from "node:test"
import {
  assessClaimSupport,
  evidenceFactSchema,
  getApplicationEvidenceBlockers
} from "../packages/shared/src/evidence/index.ts"

const fact = (overrides = {}) =>
  evidenceFactSchema.parse({
    id: "evidence-1",
    subject: "Payments migration delivery",
    value: "Led requirements and UAT for a payments migration.",
    status: "verified",
    source: {
      kind: "cv",
      label: "Candidate CV"
    },
    ...overrides
  })

test("verified evidence supports a linked material claim", () => {
  const result = assessClaimSupport({
    claim: "Led requirements and UAT for a payments migration.",
    evidence: [fact()],
    links: [{ evidenceId: "evidence-1", relation: "supports" }]
  })

  assert.equal(result.status, "supported")
  assert.deepEqual(result.evidenceIds, ["evidence-1"])
})

test("candidate-declared evidence remains usable and explicitly classified", () => {
  const result = assessClaimSupport({
    claim: "Available after a four-week notice period.",
    evidence: [
      fact({
        status: "user_declared",
        subject: "Notice period",
        value: "Four weeks",
        source: { kind: "user_confirmation", label: "Candidate confirmation" }
      })
    ],
    links: [{ evidenceId: "evidence-1", relation: "supports" }]
  })

  assert.equal(result.status, "supported")
})

test("inferred evidence requires confirmation before supporting a claim", () => {
  const result = assessClaimSupport({
    claim: "Managed a team of engineers.",
    evidence: [
      fact({
        status: "inferred",
        subject: "People management",
        value: "Possible leadership responsibility",
        source: { kind: "system_inference", label: "CV extraction" }
      })
    ],
    links: [{ evidenceId: "evidence-1", relation: "supports" }]
  })

  assert.equal(result.status, "needs_confirmation")
})

test("conflicting evidence overrides otherwise verified support", () => {
  const result = assessClaimSupport({
    claim: "Does not require sponsorship.",
    evidence: [
      fact(),
      fact({
        id: "evidence-2",
        subject: "Sponsorship requirement",
        value: "Sponsorship required",
        status: "conflicting",
        source: { kind: "candidate_profile", label: "Mobility profile" }
      })
    ],
    links: [
      { evidenceId: "evidence-1", relation: "supports" },
      { evidenceId: "evidence-2", relation: "contradicts" }
    ]
  })

  assert.equal(result.status, "conflicting")
})

test("stale evidence cannot silently support a claim", () => {
  const result = assessClaimSupport({
    claim: "Holds a current certification.",
    evidence: [fact({ status: "stale" })],
    links: [{ evidenceId: "evidence-1", relation: "supports" }]
  })

  assert.equal(result.status, "stale")
})

test("missing and unresolved links remain unsupported", () => {
  assert.equal(
    assessClaimSupport({
      claim: "Improved efficiency by 40%.",
      evidence: [],
      links: []
    }).status,
    "unsupported"
  )
  assert.match(
    assessClaimSupport({
      claim: "Improved efficiency by 40%.",
      evidence: [],
      links: [{ evidenceId: "missing", relation: "supports" }]
    }).reason,
    /could not be resolved/i
  )
})

test("gate 4: an unknown-status fact is a valid evidence status and cannot silently support a claim", () => {
  const unknownFact = fact({
    status: "unknown",
    subject: "Employer sponsors Skilled Worker visas"
  })

  assert.equal(unknownFact.status, "unknown")

  const result = assessClaimSupport({
    claim: "Employer sponsors Skilled Worker visas.",
    evidence: [unknownFact],
    links: [{ evidenceId: unknownFact.id, relation: "supports" }]
  })

  // "unknown" matches none of the specific supported/needs_confirmation/
  // stale branches, so it must fall through to unsupported exactly like
  // "missing" does - never invent certainty from an indeterminate fact.
  assert.equal(result.status, "unsupported")
})

test("evidence facts reject invalid sources and oversized values", () => {
  assert.throws(() =>
    fact({ source: { kind: "untrusted", label: "Unknown" } })
  )
  assert.throws(() => fact({ value: "x".repeat(10_001) }))
})

test("application compatibility blockers preserve current readiness behavior", () => {
  assert.deepEqual(
    getApplicationEvidenceBlockers({
      evidenceConfirmed: false,
      unsupportedClaims: ["Invented metric"]
    }),
    ["Confirm supporting evidence", "Remove unsupported claims"]
  )
  assert.deepEqual(
    getApplicationEvidenceBlockers({
      evidenceConfirmed: true,
      unsupportedClaims: []
    }),
    []
  )
})

