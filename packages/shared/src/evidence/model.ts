import { z } from "zod"

/** Canonical evidence states shared by fit decisions and application content. */
export const evidenceStatusSchema = z.enum([
  "verified",
  "user_declared",
  "inferred",
  "conflicting",
  "stale",
  "missing"
])

export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>

export const evidenceSourceKindSchema = z.enum([
  "candidate_profile",
  "cv",
  "portfolio",
  "vacancy",
  "official_source",
  "user_confirmation",
  "system_inference"
])

export type EvidenceSourceKind = z.infer<typeof evidenceSourceKindSchema>

export const evidenceSourceSchema = z.object({
  kind: evidenceSourceKindSchema,
  label: z.string().trim().min(1).max(240),
  uri: z.string().url().optional(),
  observedAt: z.string().datetime().optional()
})

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>

/** A bounded fact whose value and provenance remain independent from generated prose. */
export const evidenceFactSchema = z.object({
  id: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  value: z.string().trim().max(10_000),
  status: evidenceStatusSchema,
  source: evidenceSourceSchema,
  confirmedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
})

export type EvidenceFact = z.infer<typeof evidenceFactSchema>

export const claimEvidenceRelationSchema = z.enum([
  "supports",
  "contradicts"
])

export const claimEvidenceLinkSchema = z.object({
  evidenceId: z.string().trim().min(1).max(160),
  relation: claimEvidenceRelationSchema
})

export type ClaimEvidenceLink = z.infer<typeof claimEvidenceLinkSchema>

export const claimSupportStatusSchema = z.enum([
  "supported",
  "needs_confirmation",
  "unsupported",
  "conflicting",
  "stale"
])

export type ClaimSupportStatus = z.infer<typeof claimSupportStatusSchema>

export type ClaimSupportAssessment = {
  evidenceIds: string[]
  reason: string
  status: ClaimSupportStatus
}

/**
 * Resolves a material claim against linked evidence. Conflict always wins;
 * verified or candidate-declared support is usable; inference requires an
 * explicit confirmation; stale evidence cannot silently support a claim.
 */
export function assessClaimSupport({
  claim,
  evidence,
  links
}: {
  claim: string
  evidence: readonly EvidenceFact[]
  links: readonly ClaimEvidenceLink[]
}): ClaimSupportAssessment {
  if (!claim.trim()) {
    return {
      evidenceIds: [],
      reason: "A material claim is required before evidence can be assessed.",
      status: "unsupported"
    }
  }

  const evidenceById = new Map(evidence.map((fact) => [fact.id, fact]))
  const linked = links.flatMap((link) => {
    const fact = evidenceById.get(link.evidenceId)
    return fact ? [{ fact, relation: link.relation }] : []
  })
  const evidenceIds = [...new Set(linked.map(({ fact }) => fact.id))]

  const hasConflict = linked.some(
    ({ fact, relation }) =>
      relation === "contradicts" || fact.status === "conflicting"
  )
  if (hasConflict) {
    return {
      evidenceIds,
      reason: "Linked evidence conflicts with this claim and must be resolved.",
      status: "conflicting"
    }
  }

  const supporting = linked
    .filter(({ relation }) => relation === "supports")
    .map(({ fact }) => fact)
  if (
    supporting.some(
      (fact) => fact.status === "verified" || fact.status === "user_declared"
    )
  ) {
    return {
      evidenceIds,
      reason: "The claim is backed by verified or candidate-declared evidence.",
      status: "supported"
    }
  }

  if (supporting.some((fact) => fact.status === "inferred")) {
    return {
      evidenceIds,
      reason: "The claim relies on inferred evidence and needs candidate confirmation.",
      status: "needs_confirmation"
    }
  }

  if (supporting.some((fact) => fact.status === "stale")) {
    return {
      evidenceIds,
      reason: "The linked evidence is stale and must be refreshed before use.",
      status: "stale"
    }
  }

  return {
    evidenceIds,
    reason:
      links.length > linked.length
        ? "One or more evidence references could not be resolved."
        : "No supporting evidence is linked to this claim.",
    status: "unsupported"
  }
}

/** Compatibility policy for the current application workspace readiness model. */
export function getApplicationEvidenceBlockers({
  evidenceConfirmed,
  unsupportedClaims
}: {
  evidenceConfirmed: boolean
  unsupportedClaims: readonly string[]
}): string[] {
  return [
    !evidenceConfirmed && "Confirm supporting evidence",
    unsupportedClaims.length > 0 && "Remove unsupported claims"
  ].filter(Boolean) as string[]
}

