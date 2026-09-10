import type { ApplicationRecord, CandidateProfile, EvidenceRecord } from "shared"
import type { ReadyToApplyItem } from "./types"

export function getReadyToApplyChecklist({
  application,
  evidenceRecords,
  profile
}: {
  application: ApplicationRecord
  evidenceRecords: EvidenceRecord[]
  profile: CandidateProfile
}): ReadyToApplyItem[] {
  const applicationEvidence = evidenceRecords.filter(
    (record) => record.applicationId === application.id
  )
  const hasMissingEvidence = applicationEvidence.some(
    (record) => record.status === "missing"
  )
  const hasRiskEvidence = applicationEvidence.some(
    (record) => record.status === "risk"
  )
  const hasContentSnapshot = Boolean(application.contentSnapshot)
  const hasWorkRight = Boolean(profile.workRightDetails.trim())
  const hasCvEvidence = Boolean(profile.baseCvText.trim())
  const hasNextAction = Boolean(application.nextAction?.trim())
  const isBlocked =
    application.contentGate === "blocked" || hasRiskEvidence || !hasWorkRight

  return [
    {
      id: "score-explained",
      label: "Score explanation saved",
      status: application.fitDecision ? "ready" : "needs-check",
      evidence: application.fitDecision
        ? `Saved recommendation: ${application.fitDecision}`
        : "No saved decision index is attached to this job.",
      action: "Check EU fit before treating this job as ready."
    },
    {
      id: "evidence-records",
      label: "Evidence checked",
      status: hasRiskEvidence
        ? "blocked"
        : hasMissingEvidence || applicationEvidence.length === 0
          ? "needs-check"
          : "ready",
      evidence: applicationEvidence.length
        ? "Evidence records are saved for this job."
        : "No evidence records are saved for this job.",
      action: "Review missing or risk evidence before applying."
    },
    {
      id: "cv-proof",
      label: "CV proof available",
      status: hasCvEvidence ? "ready" : "needs-check",
      evidence: hasCvEvidence
        ? "Saved CV text is available for truthful tailoring."
        : "CV text is missing.",
      action: "Add CV text so application content can stay evidence-based."
    },
    {
      id: "application-content",
      label: "Job proof saved",
      status: hasContentSnapshot ? "ready" : "needs-check",
      evidence: hasContentSnapshot
        ? `Saved on ${new Date(
            application.contentSnapshot?.savedAt ?? application.createdAt
          ).toLocaleDateString()}.`
        : "No job proof snapshot is saved yet.",
      action: "Save job proof from Application Kit or Interview Prep before applying."
    },
    {
      id: "work-right",
      label: "Work-right statement verified",
      status: hasWorkRight ? "ready" : "blocked",
      evidence: hasWorkRight
        ? profile.workRightDetails
        : "No work-right details are saved.",
      action:
        "Add truthful work-right details and check official sources or a qualified adviser for immigration decisions."
    },
    {
      id: "next-action",
      label: "Next action clear",
      status: hasNextAction ? "ready" : "needs-check",
      evidence: hasNextAction
        ? (application.nextAction ?? "")
        : "No next action is set.",
      action: "Set the next manual step so the job does not get lost."
    },
    {
      id: "final-gate",
      label: "Final apply gate",
      status: isBlocked
        ? "blocked"
        : application.contentGate === "stretch" || hasMissingEvidence
          ? "needs-check"
          : "ready",
      evidence: isBlocked
        ? "A blocker or risk is still present."
        : application.contentGate === "stretch"
          ? "This is a stretch application."
          : "No saved blocker is currently attached to this job.",
      action: "Apply only after blockers and missing evidence are resolved."
    }
  ]
}
