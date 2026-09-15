"use client"

import { useState, type FormEvent } from "react"
import type { AdminMobilityCorrection } from "../../../lib/admin-mobility-corrections"

function CorrectionReview({ correction, onCompleted }: { correction: AdminMobilityCorrection; onCompleted: (decision: "triaged" | "accepted" | "rejected") => void }) {
  const [decision, setDecision] = useState<"triaged" | "accepted" | "rejected">(
    correction.state === "triaged" ? "rejected" : "triaged",
  )
  const [reasonCode, setReasonCode] = useState("REVIEW_REQUIRED")
  const [notes, setNotes] = useState("")
  const [successorDecisionId, setSuccessorDecisionId] = useState("")
  const [evidenceType, setEvidenceType] = useState("source_version")
  const [evidenceId, setEvidenceId] = useState("")
  const [status, setStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true); setStatus("")
    try {
      const response = await fetch("/api/admin/mobility-corrections/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId: correction.id, decision, reasonCodes: [reasonCode.trim().toUpperCase()],
          resolutionNotes: notes, successorDecisionId: successorDecisionId || null,
          evidenceReferences: evidenceId ? [{ type: evidenceType, id: evidenceId }] : [],
          reviewedAt: new Date().toISOString(), confirm: true,
        }),
      })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || "Review could not be recorded")
      onCompleted(decision)
      if (decision === "triaged") setDecision("rejected")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Review could not be recorded")
    } finally { setSubmitting(false) }
  }

  return (
    <article className="operations-admin-review-card">
      <header><span>{correction.state}</span><strong>{correction.targetType.replaceAll("_", " ")}</strong><small>{new Date(correction.submittedAt).toLocaleString("en-GB")}</small></header>
      <p>{correction.reason}</p>
      <small>Decision {correction.originalDecisionId} · target {correction.targetId}</small>
      <form onSubmit={submit}>
        <label>Review outcome<select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}>{correction.state === "submitted" ? <option value="triaged">Mark triaged</option> : null}<option value="rejected">Reject disagreement</option><option value="accepted">Accept with successor</option></select></label>
        <label>Reason code<input pattern="[A-Z0-9_]+" required value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} /></label>
        <label>Resolution notes<textarea minLength={10} required value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {decision === "accepted" ? <>
          <label>Successor decision ID<input required value={successorDecisionId} onChange={(event) => setSuccessorDecisionId(event.target.value)} /></label>
          <label>Evidence type<select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}><option value="source_version">Source version</option><option value="candidate_evidence">Candidate evidence</option><option value="vacancy_snapshot">Vacancy snapshot</option><option value="employer_verification">Employer verification</option><option value="decision">Decision</option></select></label>
          <label>Evidence record ID<input required value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} /></label>
        </> : null}
        <button disabled={submitting} type="submit">{submitting ? "Recording…" : "Record governed review"}</button>
      </form>
      {status ? <p className="notice-error" role="alert">{status}</p> : null}
    </article>
  )
}

export function AdminMobilityCorrectionQueue({ initialCorrections }: { initialCorrections: AdminMobilityCorrection[] }) {
  const [corrections, setCorrections] = useState(initialCorrections)
  if (!corrections.length) return <p>No submitted or triaged decision corrections.</p>
  return <section className="operations-admin-review-list" aria-label="Open mobility decision corrections">
    {corrections.map((correction) => <CorrectionReview key={correction.id} correction={correction} onCompleted={(decision) => setCorrections((current) => decision === "triaged"
      ? current.map((item) => item.id === correction.id ? { ...item, state: "triaged" } : item)
      : current.filter((item) => item.id !== correction.id))} />)}
  </section>
}
