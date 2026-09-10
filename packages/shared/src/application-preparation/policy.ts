import type { InternationalDecision } from "../international/types.ts"
import {
  getApplicationEvidenceBlockers,
  type ClaimSupportAssessment
} from "../evidence/model.ts"

export type PreparationStage = "ready" | "needs_review" | "blocked"

export type PreparationAssessment = {
  blockers: string[]
  reviewItems: string[]
  stage: PreparationStage
}

const BLOCKED_DECISIONS = new Set<InternationalDecision>([
  "Skip",
  "Insufficient evidence"
])

/**
 * Determines whether an application draft may be generated from the final
 * cross-domain decision and available evidence. This policy never calls AI.
 */
export function assessDraftEligibility({
  decision,
  decisionBlockers = [],
  missingEvidence = [],
  claimAssessments = []
}: {
  decision: InternationalDecision
  decisionBlockers?: readonly string[]
  missingEvidence?: readonly string[]
  claimAssessments?: readonly ClaimSupportAssessment[]
}): PreparationAssessment {
  const claimBlockers = claimAssessments
    .filter((assessment) =>
      ["unsupported", "conflicting", "stale"].includes(assessment.status)
    )
    .map((assessment) => assessment.reason)
  const blockers = [
    ...missingEvidence.map((item) => `Missing required evidence: ${item}.`),
    ...decisionBlockers,
    ...claimBlockers,
    BLOCKED_DECISIONS.has(decision) &&
      `Content generation is blocked by the cross-border decision gate (${decision}).`
  ].filter(Boolean) as string[]
  const reviewItems = claimAssessments
    .filter((assessment) => assessment.status === "needs_confirmation")
    .map((assessment) => assessment.reason)

  return {
    blockers,
    reviewItems,
    stage: blockers.length
      ? "blocked"
      : reviewItems.length
        ? "needs_review"
        : "ready"
  }
}

/** Compatibility adapter for the current content-generation API response. */
export function getContentPreparationBlockers(input: {
  decision: InternationalDecision
  decisionBlockers?: readonly string[]
  missingEvidence?: readonly string[]
}): string[] {
  return assessDraftEligibility(input).blockers
}

/** Final review policy used before an application can become Ready. */
export function assessApplicationApproval({
  consequentialAnswersReviewed,
  employerConfirmed,
  evidenceConfirmed,
  roleTitleConfirmed,
  unsupportedClaims
}: {
  consequentialAnswersReviewed: boolean
  employerConfirmed: boolean
  evidenceConfirmed: boolean
  roleTitleConfirmed: boolean
  unsupportedClaims: readonly string[]
}): PreparationAssessment {
  const blockers = [
    !roleTitleConfirmed && "Confirm the role title",
    !employerConfirmed && "Confirm the employer",
    ...getApplicationEvidenceBlockers({ evidenceConfirmed, unsupportedClaims }),
    !consequentialAnswersReviewed && "Review consequential answers"
  ].filter(Boolean) as string[]

  return {
    blockers,
    reviewItems: [],
    stage: blockers.length ? "blocked" : "ready"
  }
}

export type ReleasePermission = {
  allowed: boolean
  reason: string | null
}

/** Export requires completed review; it does not imply that an application was submitted. */
export function getExportPermission({
  approval,
  humanReviewConfirmed
}: {
  approval: PreparationAssessment
  humanReviewConfirmed: boolean
}): ReleasePermission {
  if (approval.stage !== "ready") {
    return {
      allowed: false,
      reason: "Resolve every readiness blocker before exporting."
    }
  }

  if (!humanReviewConfirmed) {
    return {
      allowed: false,
      reason: "Confirm human review before exporting."
    }
  }

  return { allowed: true, reason: null }
}

/** Submission remains a separate, explicit action after application approval. */
export function getSubmissionPermission({
  approval,
  currentStatus,
  explicitConfirmation
}: {
  approval: PreparationAssessment
  currentStatus: string
  explicitConfirmation: boolean
}): ReleasePermission {
  if (approval.stage !== "ready") {
    return {
      allowed: false,
      reason: "Resolve every readiness blocker before submission."
    }
  }

  if (currentStatus !== "Ready" || !explicitConfirmation) {
    return {
      allowed: false,
      reason: "Confirm a Ready application before marking it applied."
    }
  }

  return { allowed: true, reason: null }
}

