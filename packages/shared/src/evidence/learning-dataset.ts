import { z } from "zod"
import { learningEvaluationCaseSchema, type LearningEvaluationCase } from "./learning-evaluation.ts"

const timestamp = z.string().datetime({ offset: true })
const assignmentSchema = z.object({
  id: z.string().uuid(), userId: z.string().uuid(), consentId: z.string().uuid(),
  variant: z.enum(["control", "treatment"]), assignedAt: timestamp,
})
const observationSchema = z.object({
  decisionId: z.string().uuid(), userId: z.string().uuid(),
  recommendedAction: z.enum(["apply", "investigate", "skip"]),
  expertSafe: z.boolean(),
})
const eventSchema = z.object({
  consentId: z.string().uuid(), decisionId: z.string().uuid(), correctionId: z.string().uuid().nullable(),
  eventType: z.enum(["decision_viewed", "apply_started", "applied", "skipped", "employer_contacted", "employer_response", "correction_submitted", "interview", "offer", "rejected", "withdrawn", "no_response"]),
  occurredAt: timestamp,
})
const correctionReviewSchema = z.object({ correctionId: z.string().uuid(), decision: z.enum(["triaged", "accepted", "rejected"]), reviewedAt: timestamp })
const comprehensionSchema = z.object({ decisionId: z.string().uuid(), consentId: z.string().uuid(), understood: z.boolean(), respondedAt: timestamp })

export function assembleLearningEvaluationCases(raw: {
  assignments: unknown[]; observations: unknown[]; events: unknown[];
  correctionReviews: unknown[]; validConsentIdsAtCutoff: string[]; datasetCutoffAt: string;
  comprehensionResponses?: unknown[];
}): LearningEvaluationCase[] {
  const assignments = z.array(assignmentSchema).parse(raw.assignments)
  const observations = z.array(observationSchema).parse(raw.observations)
  const events = z.array(eventSchema).parse(raw.events)
  const reviews = z.array(correctionReviewSchema).parse(raw.correctionReviews)
  const comprehension = z.array(comprehensionSchema).parse(raw.comprehensionResponses ?? [])
  const cutoff = timestamp.parse(raw.datasetCutoffAt)
  const validConsents = new Set(z.array(z.string().uuid()).parse(raw.validConsentIdsAtCutoff))
  const observationsById = new Map(observations.map((item) => [item.decisionId, item]))

  return assignments.flatMap((assignment) => {
    const eligibleEvents = events.filter((event) => event.occurredAt >= assignment.assignedAt && event.occurredAt <= cutoff
      && event.consentId === assignment.consentId && observationsById.get(event.decisionId)?.userId === assignment.userId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.decisionId.localeCompare(right.decisionId))
    const decisionId = eligibleEvents[0]?.decisionId
    const observation = decisionId ? observationsById.get(decisionId) : undefined
    if (!decisionId || !observation) return []
    const decisionEvents = eligibleEvents.filter((event) => event.decisionId === decisionId)
    const eventTypes = new Set(decisionEvents.map((event) => event.eventType))
    const observedAction = eventTypes.has("applied") ? "applied" : eventTypes.has("skipped") ? "skipped"
      : eventTypes.has("apply_started") ? "investigated" : "unknown"
    const outcome = (["offer", "interview", "rejected", "withdrawn", "no_response"] as const)
      .find((type) => eventTypes.has(type)) ?? "unknown"
    const correctionIds = decisionEvents.filter((event) => event.eventType === "correction_submitted" && event.correctionId).map((event) => event.correctionId as string)
    const matchingReviews = reviews.filter((review) => correctionIds.includes(review.correctionId) && review.reviewedAt <= cutoff)
      .sort((left, right) => right.reviewedAt.localeCompare(left.reviewedAt))
    const correctionOutcome = !correctionIds.length ? "none" : matchingReviews[0]?.decision === "accepted" ? "accepted"
      : matchingReviews[0]?.decision === "rejected" ? "rejected" : "pending"
    const clarity = comprehension.filter((response) => response.decisionId === decisionId
      && response.consentId === assignment.consentId && response.respondedAt <= cutoff)
      .sort((left, right) => right.respondedAt.localeCompare(left.respondedAt))[0]
    return [learningEvaluationCaseSchema.parse({
      assignmentId: assignment.id, decisionId, variant: assignment.variant,
      recommendedAction: observation.recommendedAction, observedAction, outcome,
      correctionOutcome, expertSafe: observation.expertSafe,
      userUnderstood: clarity?.understood ?? null,
      consentValid: validConsents.has(assignment.consentId),
    })]
  })
}
