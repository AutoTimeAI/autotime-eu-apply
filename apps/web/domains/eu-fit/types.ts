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
  /**
   * When this source was last reviewed against the live official page, and
   * which internally-versioned rule set that review produced. Optional and
   * absent (never invented) for a country without a dedicated review pass
   * yet - see acceptance-gate-audit-2026-09-10.md gate 3.
   */
  reviewedAt?: string
  ruleVersion?: string
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
