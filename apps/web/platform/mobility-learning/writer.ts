import { createHash } from "node:crypto"
import { z } from "zod"

export const learningEventRequestSchema = z.object({
  consentId: z.string().uuid(), decisionId: z.string().uuid(),
  applicationId: z.string().uuid().nullable().default(null), outcomeRecordId: z.string().uuid().nullable().default(null),
  correctionId: z.string().uuid().nullable().default(null),
  eventType: z.enum(["decision_viewed", "apply_started", "applied", "skipped", "employer_contacted", "employer_response", "correction_submitted", "interview", "offer", "rejected", "withdrawn", "no_response"]),
  evidenceClass: z.enum(["observed", "user_reported", "system_derived"]),
  reasonCode: z.string().trim().min(1).max(80).optional(),
  occurredAt: z.string().datetime(),
}).strict()
export const learningConsentRequestSchema = z.object({
  action: z.enum(["grant", "revoke"]), policyVersion: z.string().trim().min(1).max(40),
  scopes: z.array(z.enum(["decision_action", "correction", "employer_response", "application_outcome"])).max(4),
}).strict().superRefine((value, context) => {
  if ((value.action === "grant" && value.scopes.length === 0) || (value.action === "revoke" && value.scopes.length > 0)) context.addIssue({ code: "custom", message: "Consent action and scopes disagree" })
})
export const comprehensionRequestSchema = z.object({
  consentId: z.string().uuid(), decisionId: z.string().uuid(), understood: z.boolean(),
  reasonCode: z.enum(["CLEAR", "UNCLEAR_TERMINOLOGY", "UNCLEAR_EVIDENCE", "UNCLEAR_ACTION", "OTHER"]),
  respondedAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  if ((value.understood && value.reasonCode !== "CLEAR") || (!value.understood && value.reasonCode === "CLEAR"))
    context.addIssue({ code: "custom", message: "Comprehension response and reason disagree" })
})

export interface LearningWriteClient {
  from(table: string): { insert(value: Record<string, unknown>): { select(columns: string): { single(): PromiseLike<{ data: unknown; error: unknown }> } } }
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex")

export async function appendLearningEvent(client: LearningWriteClient, userId: string, raw: unknown) {
  const value = learningEventRequestSchema.parse(raw)
  const identity = [userId, value.decisionId, value.eventType, value.occurredAt, value.applicationId, value.outcomeRecordId, value.correctionId].join(":")
  const idempotencyKey = hash(identity)
  const payload = value.reasonCode ? { reasonCode: value.reasonCode } : {}
  const result = await client.from("mobility_learning_events").insert({
    user_id: userId, consent_id: value.consentId, decision_id: value.decisionId,
    application_id: value.applicationId, outcome_record_id: value.outcomeRecordId, correction_id: value.correctionId,
    event_type: value.eventType, evidence_class: value.evidenceClass, payload,
    event_sha256: hash(JSON.stringify({ ...value, payload, userId })), occurred_at: value.occurredAt, idempotency_key: idempotencyKey,
  }).select("id").single()
  if (result.error) throw new Error("Mobility learning event could not be recorded")
  return { id: (result.data as { id: string }).id, idempotencyKey }
}

export async function appendLearningConsent(client: LearningWriteClient, userId: string, raw: unknown) {
  const value = learningConsentRequestSchema.parse(raw)
  const result = await client.rpc("append_mobility_learning_consent", {
    p_user_id: userId, p_policy_version: value.policyVersion, p_action: value.action, p_scopes: value.scopes,
  })
  if (result.error || typeof result.data !== "string") throw new Error("Mobility learning consent could not be recorded")
  return { id: result.data }
}

export async function appendComprehensionResponse(client: LearningWriteClient, userId: string, raw: unknown) {
  const value = comprehensionRequestSchema.parse(raw)
  const result = await client.rpc("append_mobility_decision_comprehension", {
    p_user_id: userId, p_decision_id: value.decisionId, p_consent_id: value.consentId,
    p_understood: value.understood, p_reason_code: value.reasonCode, p_responded_at: value.respondedAt,
  })
  if (result.error || typeof result.data !== "string") throw new Error("Comprehension response could not be recorded")
  return { id: result.data }
}
