import assert from "node:assert/strict"
import test from "node:test"
import {
  assessApplicationApproval,
  assessDraftEligibility,
  getContentPreparationBlockers,
  getExportPermission,
  getSubmissionPermission
} from "../packages/shared/src/application-preparation/index.ts"

const readyApproval = () =>
  assessApplicationApproval({
    consequentialAnswersReviewed: true,
    employerConfirmed: true,
    evidenceConfirmed: true,
    roleTitleConfirmed: true,
    unsupportedClaims: []
  })

test("Apply, Stretch and Investigate decisions may prepare content when evidence is complete", () => {
  for (const decision of ["Apply", "Stretch application", "Investigate first"]) {
    assert.equal(assessDraftEligibility({ decision }).stage, "ready", decision)
  }
})

test("Skip and insufficient-evidence decisions block draft generation", () => {
  for (const decision of ["Skip", "Insufficient evidence"]) {
    const result = assessDraftEligibility({ decision })
    assert.equal(result.stage, "blocked", decision)
    assert.match(result.blockers.at(-1), new RegExp(`\\(${decision}\\)`))
  }
})

test("missing evidence and decision blockers preserve current API wording", () => {
  assert.deepEqual(
    getContentPreparationBlockers({
      decision: "Apply",
      decisionBlockers: ["Sponsorship unavailable."],
      missingEvidence: ["CV text"]
    }),
    ["Missing required evidence: CV text.", "Sponsorship unavailable."]
  )
})

test("claim conflicts, stale evidence and unsupported claims block preparation", () => {
  for (const status of ["conflicting", "stale", "unsupported"]) {
    const result = assessDraftEligibility({
      decision: "Apply",
      claimAssessments: [{ evidenceIds: [], reason: `${status} claim`, status }]
    })
    assert.equal(result.stage, "blocked", status)
  }
})

test("inferred claim support requires review instead of silently passing", () => {
  const result = assessDraftEligibility({
    decision: "Apply",
    claimAssessments: [
      {
        evidenceIds: ["evidence-1"],
        reason: "Candidate confirmation required.",
        status: "needs_confirmation"
      }
    ]
  })
  assert.equal(result.stage, "needs_review")
  assert.deepEqual(result.reviewItems, ["Candidate confirmation required."])
})

test("application approval reports every current readiness blocker", () => {
  const result = assessApplicationApproval({
    consequentialAnswersReviewed: false,
    employerConfirmed: false,
    evidenceConfirmed: false,
    roleTitleConfirmed: false,
    unsupportedClaims: ["Invented metric"]
  })

  assert.equal(result.stage, "blocked")
  assert.deepEqual(result.blockers, [
    "Confirm the role title",
    "Confirm the employer",
    "Confirm supporting evidence",
    "Remove unsupported claims",
    "Review consequential answers"
  ])
})

test("export requires both readiness and explicit human review", () => {
  assert.equal(
    getExportPermission({ approval: readyApproval(), humanReviewConfirmed: false }).allowed,
    false
  )
  assert.equal(
    getExportPermission({ approval: readyApproval(), humanReviewConfirmed: true }).allowed,
    true
  )
})

test("submission requires a Ready application and explicit confirmation", () => {
  assert.equal(
    getSubmissionPermission({
      approval: readyApproval(),
      currentStatus: "Needs review",
      explicitConfirmation: true
    }).allowed,
    false
  )
  assert.equal(
    getSubmissionPermission({
      approval: readyApproval(),
      currentStatus: "Ready",
      explicitConfirmation: false
    }).allowed,
    false
  )
  assert.equal(
    getSubmissionPermission({
      approval: readyApproval(),
      currentStatus: "Ready",
      explicitConfirmation: true
    }).allowed,
    true
  )
})

