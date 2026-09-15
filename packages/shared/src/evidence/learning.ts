import { z } from "zod"

export const mobilityLearningScopeSchema = z.enum(["decision_action", "correction", "employer_response", "application_outcome"])
export const mobilityLearningEventTypeSchema = z.enum(["decision_viewed", "apply_started", "applied", "skipped", "employer_contacted", "employer_response", "correction_submitted", "interview", "offer", "rejected", "withdrawn", "no_response"])
export const mobilityLearningConsentSchema = z.object({
  id: z.string().uuid(), userId: z.string().uuid(), version: z.number().int().positive(),
  policyVersion: z.string().min(1), action: z.enum(["grant", "revoke"]), scopes: z.array(mobilityLearningScopeSchema),
  predecessorConsentId: z.string().uuid().nullable(), effectiveAt: z.string().datetime(),
}).superRefine((value, context) => {
  if ((value.version === 1) !== (value.predecessorConsentId === null)) context.addIssue({ code: "custom", message: "Consent successor lineage is required" })
  if ((value.action === "grant" && value.scopes.length === 0) || (value.action === "revoke" && value.scopes.length > 0)) context.addIssue({ code: "custom", message: "Consent action and scopes disagree" })
})
export const mobilityLearningEventSchema = z.object({
  id: z.string().uuid(), userId: z.string().uuid(), consentId: z.string().uuid(), decisionId: z.string().uuid(),
  applicationId: z.string().uuid().nullable(), outcomeRecordId: z.string().uuid().nullable(), correctionId: z.string().uuid().nullable(),
  eventType: mobilityLearningEventTypeSchema, evidenceClass: z.enum(["observed", "user_reported", "system_derived"]),
  payload: z.record(z.string(), z.unknown()), eventSha256: z.string().regex(/^[a-f0-9]{64}$/), occurredAt: z.string().datetime(), idempotencyKey: z.string().min(1),
})
