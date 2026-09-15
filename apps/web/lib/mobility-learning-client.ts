const consentKey = (userId: string) => `autotime-mobility-learning-consent:v1:${userId}`
export type LearningConsentState = { consentId: string; enabled: boolean; policyVersion: "2026-09" }

export function readLearningConsent(storage: Pick<Storage, "getItem">, userId: string): LearningConsentState | null {
  try {
    const value = JSON.parse(storage.getItem(consentKey(userId)) ?? "null") as Partial<LearningConsentState> | null
    return value?.policyVersion === "2026-09" && typeof value.consentId === "string" && typeof value.enabled === "boolean"
      ? value as LearningConsentState : null
  } catch { return null }
}

export async function setLearningConsent(storage: Pick<Storage, "setItem">, userId: string, enabled: boolean): Promise<LearningConsentState> {
  const response = await fetch("/api/mobility/learning/consent", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: enabled ? "grant" : "revoke", policyVersion: "2026-09", scopes: enabled ? ["decision_action", "correction", "employer_response", "application_outcome"] : [] }),
  })
  const body = await response.json() as { data: { id?: string } | null; error: string | null }
  if (!response.ok || !body.data?.id) throw new Error(body.error ?? "Learning preference could not be saved")
  const state: LearningConsentState = { consentId: body.data.id, enabled, policyVersion: "2026-09" }
  storage.setItem(consentKey(userId), JSON.stringify(state))
  return state
}

export async function emitMobilityLearningEvent(input: { consentId: string; decisionId: string; applicationId?: string; correctionId?: string; eventType: "decision_viewed" | "apply_started" | "applied" | "skipped" | "employer_contacted" | "employer_response" | "correction_submitted" | "interview" | "offer" | "rejected" | "withdrawn" | "no_response"; evidenceClass: "observed" | "user_reported" | "system_derived"; occurredAt?: string }) {
  const response = await fetch("/api/mobility/learning/events", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consentId: input.consentId, decisionId: input.decisionId, applicationId: input.applicationId ?? null, outcomeRecordId: null, correctionId: input.correctionId ?? null, eventType: input.eventType, evidenceClass: input.evidenceClass, occurredAt: input.occurredAt ?? new Date().toISOString() }),
  })
  if (!response.ok) throw new Error("Learning event could not be recorded")
}

export async function submitMobilityComprehension(input: { consentId: string; decisionId: string; understood: boolean; reasonCode: "CLEAR" | "UNCLEAR_TERMINOLOGY" | "UNCLEAR_EVIDENCE" | "UNCLEAR_ACTION" | "OTHER" }) {
  const response = await fetch("/api/mobility/learning/comprehension", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, respondedAt: new Date().toISOString() }),
  })
  const body = await response.json() as { data?: { id?: string }; error?: string }
  if (!response.ok || !body.data?.id) throw new Error(body.error ?? "Clarity response could not be saved")
  return body.data.id
}
