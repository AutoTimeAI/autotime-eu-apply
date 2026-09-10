import type {
  ApplicationRecord,
  CandidateProfile,
  CountryFitEvaluation,
  EvidenceRecord
} from "shared"

export function createEvidenceRecords({
  application,
  fitEvaluation,
  profile
}: {
  application: ApplicationRecord
  fitEvaluation: CountryFitEvaluation
  profile: CandidateProfile
}): EvidenceRecord[] {
  const now = new Date().toISOString()
  const componentRecords = fitEvaluation.components.map((component) => ({
    id: crypto.randomUUID(),
    applicationId: application.id,
    jobUrl: application.url,
    checkKey: component.key,
    checkLabel: component.label,
    status:
      component.status === "blocker"
        ? "risk"
        : component.evidence.length
          ? "found"
          : "missing",
    evidenceText: component.evidence.join(" ") || "No direct evidence found.",
    sourceType: component.evidence.length ? "job_text" : "system_rule",
    sourceLabel: component.evidence.length
      ? "Saved profile and job text"
      : "AutoTime rule check",
    missingInput: component.evidence.length ? undefined : component.label,
    riskFlag: component.status === "blocker" ? component.rationale : undefined,
    explanation: component.rationale,
    limit:
      "This evidence record is based on saved profile, job text and local decision rules only.",
    createdAt: now
  })) satisfies EvidenceRecord[]

  const profileEvidence: EvidenceRecord[] = [
    {
      id: crypto.randomUUID(),
      applicationId: application.id,
      jobUrl: application.url,
      checkKey: "profile-work-right",
      checkLabel: "Work-right evidence",
      status: profile.workRightDetails.trim() ? "found" : "missing",
      evidenceText:
        profile.workRightDetails.trim() || "Work-right evidence is missing.",
      sourceType: "profile",
      sourceLabel: "Saved candidate profile",
      missingInput: profile.workRightDetails.trim()
        ? undefined
        : "work-right details",
      explanation:
        "Work-right evidence is required before application advice can be treated as strong.",
      limit:
        "AutoTime does not authorise employment, visa, immigration or sponsorship status.",
      createdAt: now
    },
    {
      id: crypto.randomUUID(),
      applicationId: application.id,
      jobUrl: application.url,
      checkKey: "profile-cv",
      checkLabel: "CV evidence",
      status: profile.baseCvText.trim() ? "found" : "missing",
      evidenceText: profile.baseCvText.trim()
        ? profile.baseCvText.trim().slice(0, 600)
        : "CV evidence is missing.",
      sourceType: "cv",
      sourceLabel: "Saved CV text",
      missingInput: profile.baseCvText.trim() ? undefined : "CV evidence",
      explanation: "CV evidence is used to match the role against your profile.",
      limit:
        "Only user-saved CV text is used for this check.",
      createdAt: now
    }
  ]

  const blockerRecords = fitEvaluation.blockers.map((blocker) => ({
    id: crypto.randomUUID(),
    applicationId: application.id,
    jobUrl: application.url,
    checkKey: "decision-blocker",
    checkLabel: "Decision blocker",
    status: "risk",
    evidenceText: blocker,
    sourceType: "system_rule",
    sourceLabel: "AutoTime decision rule",
    riskFlag: blocker,
    explanation: blocker,
    limit:
      "A blocker is a risk signal, not an official employer, immigration or legal decision.",
    createdAt: now
  })) satisfies EvidenceRecord[]

  return [...componentRecords, ...profileEvidence, ...blockerRecords]
}
