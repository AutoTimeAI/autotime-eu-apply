import { z } from "zod"

const idSchema = z.string().trim().min(1).max(160)
const timestampSchema = z.string().datetime({ offset: true })

export const mobilityEvidenceDecisionStateSchema = z.enum([
  "potential_match",
  "not_supported",
  "insufficient_evidence",
  "source_conflict",
  "employer_unverified",
  "ruleset_quarantined",
  "expert_review_required",
  "information_only"
])

export const employerVerificationStateSchema = z.enum([
  "verified",
  "ambiguous",
  "not_found",
  "stale",
  "not_checked",
  "not_applicable"
])

export const mobilityOutputPermissionSchema = z.enum([
  "definitive",
  "conditional",
  "information_only",
  "regulated_review",
  "authority_review",
  "blocked"
])

export const decisionEvidenceLinkSchema = z.object({
  claimVersionId: idSchema,
  evidenceVersionIds: z.array(idSchema).default([]),
  sourceSpanIds: z.array(idSchema).min(1),
  relation: z.enum(["supports", "contradicts", "limits"])
})

export const immutableMobilityDecisionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  candidateEvidenceVersionIds: z.array(idSchema),
  vacancySnapshotId: idSchema,
  employerVerificationId: idSchema.optional(),
  ruleBundleVersionId: idSchema,
  sourceVersionIds: z.array(idSchema).min(1),
  mobilityState: mobilityEvidenceDecisionStateSchema,
  employerState: employerVerificationStateSchema,
  outputPermission: mobilityOutputPermissionSchema,
  reasonCodes: z.array(idSchema).min(1),
  evidenceLinks: z.array(decisionEvidenceLinkSchema).min(1),
  renderedClaims: z.array(z.string().trim().min(1).max(20_000)),
  supersedesDecisionId: idSchema.optional(),
  recordedAt: timestampSchema
})

export type ImmutableMobilityDecision = z.infer<
  typeof immutableMobilityDecisionSchema
>

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue }

function canonicalize(value: unknown): CanonicalValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value
  }
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    )
  }
  throw new TypeError(`Unsupported canonical value: ${typeof value}`)
}

/** Stable JSON for byte-equivalent replay. Volatile record identity is excluded. */
export function canonicalDecisionOutput(
  decision: ImmutableMobilityDecision
): string {
  const parsed = immutableMobilityDecisionSchema.parse(decision)
  return JSON.stringify(
    canonicalize({
      candidateEvidenceVersionIds: [...parsed.candidateEvidenceVersionIds].sort(),
      vacancySnapshotId: parsed.vacancySnapshotId,
      employerVerificationId: parsed.employerVerificationId,
      ruleBundleVersionId: parsed.ruleBundleVersionId,
      sourceVersionIds: [...parsed.sourceVersionIds].sort(),
      mobilityState: parsed.mobilityState,
      employerState: parsed.employerState,
      outputPermission: parsed.outputPermission,
      reasonCodes: [...parsed.reasonCodes].sort(),
      evidenceLinks: [...parsed.evidenceLinks]
        .map((link) => ({
          ...link,
          evidenceVersionIds: [...link.evidenceVersionIds].sort(),
          sourceSpanIds: [...link.sourceSpanIds].sort()
        }))
        .sort((left, right) =>
          `${left.claimVersionId}:${left.relation}`.localeCompare(
            `${right.claimVersionId}:${right.relation}`
          )
        ),
      renderedClaims: parsed.renderedClaims
    })
  )
}

export function compareDecisionReplay({
  original,
  replayed
}: {
  original: ImmutableMobilityDecision
  replayed: ImmutableMobilityDecision
}): { equivalent: boolean; originalCanonical: string; replayCanonical: string } {
  const originalCanonical = canonicalDecisionOutput(original)
  const replayCanonical = canonicalDecisionOutput(replayed)
  return {
    equivalent: originalCanonical === replayCanonical,
    originalCanonical,
    replayCanonical
  }
}
