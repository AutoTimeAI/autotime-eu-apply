import assert from "node:assert/strict"
import test from "node:test"
import {
  assessClaimSupport,
  evidenceFactSchema,
  getApplicationEvidenceBlockers,
  mobilityClaimVersionSchema,
  mobilityRuleBundleVersionSchema,
  mobilitySourceVersionSchema
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

const hash = "a".repeat(64)

test("versioned source captures preserve temporal and content identity", () => {
  const source = mobilitySourceVersionSchema.parse({
    id: "source-version-2",
    sourceDocumentId: "de-blue-card-law",
    version: 2,
    retrievedAt: "2026-09-12T10:00:00Z",
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveTo: "2027-01-01T00:00:00Z",
    language: "de",
    httpStatus: 200,
    rawSha256: hash,
    normalizedSha256: "b".repeat(64),
    snapshotUri: "https://evidence.autotime.test/de/source-version-2",
    parserVersion: "parser-1",
    normalizerVersion: "normalizer-1"
  })

  assert.equal(source.version, 2)
  assert.throws(() =>
    mobilitySourceVersionSchema.parse({
      ...source,
      effectiveFrom: "2027-01-01T00:00:00Z",
      effectiveTo: "2026-01-01T00:00:00Z"
    })
  )
})

test("claim successors require explicit lineage", () => {
  const base = {
    id: "claim-version-2",
    claimId: "DE-LAW-001",
    version: 2,
    statement: "A successor rule statement.",
    claimType: "fact",
    sourceSpanIds: ["span-1"],
    confidence: "high",
    state: "approved"
  }

  assert.throws(() => mobilityClaimVersionSchema.parse(base))
  assert.equal(
    mobilityClaimVersionSchema.parse({
      ...base,
      predecessorVersionId: "claim-version-1"
    }).predecessorVersionId,
    "claim-version-1"
  )
  assert.throws(() =>
    mobilityClaimVersionSchema.parse({
      ...base,
      version: 1,
      predecessorVersionId: "impossible"
    })
  )
})

test("rule bundles cannot exist without claims and evaluation cases", () => {
  const bundle = {
    id: "de-blue-card-v1",
    bundleId: "de-blue-card",
    version: 1,
    jurisdiction: "Germany",
    route: "EU Blue Card",
    state: "draft"
  }

  assert.throws(() => mobilityRuleBundleVersionSchema.parse(bundle))
  assert.equal(
    mobilityRuleBundleVersionSchema.parse({
      ...bundle,
      criticalClaimVersionIds: ["claim-version-1"],
      evaluationCaseIds: ["DE-SALARY-001"]
    }).state,
    "draft"
  )
})
