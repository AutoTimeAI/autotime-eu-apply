import type { CountryFitEvaluation } from "shared"

export type DecisionBrief = {
  decision: CountryFitEvaluation["decision"]
  confidence: "Low" | "Medium" | "High"
  score: number
  contentGate: CountryFitEvaluation["contentGate"]
  rationale: string[]
  evidenceFound: string[]
  risks: string[]
  nextActions: string[]
  missingInputs: string[]
}

export type OfficialSource = {
  label: string
  url: string
  note: string
}

export type VerificationChecklistItem = {
  id: string
  label: string
  status: "ready" | "needs-check" | "blocked"
  evidence: string
  limit: string
}

export type ContentGuardrail = {
  label: string
  status: "ready" | "warning" | "blocked"
  reason: string
}
