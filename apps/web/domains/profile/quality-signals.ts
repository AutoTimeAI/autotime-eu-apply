import type { CandidateProfile, ReusableAnswers } from "shared"
import type { ProfileQualitySignal } from "./types"

export function scoreTextEvidence(text: string, strongLength: number) {
  const length = text.trim().length

  if (length >= strongLength) {
    return 100
  }

  if (length >= strongLength / 2) {
    return 70
  }

  if (length >= 40) {
    return 45
  }

  return 15
}

export function getSignalStatus(score: number): ProfileQualitySignal["status"] {
  if (score >= 75) {
    return "ready"
  }

  if (score >= 45) {
    return "needs-check"
  }

  return "blocked"
}

export function getProfileSignalStatusLabel(status: ProfileQualitySignal["status"]) {
  if (status === "ready") {
    return "Ready"
  }

  if (status === "needs-check") {
    return "Needs review"
  }

  return "Missing"
}

export function getProfileQualitySignals(
  profile: CandidateProfile,
  reusableAnswers: ReusableAnswers
): ProfileQualitySignal[] {
  const evidenceScore = Math.round(
    (scoreTextEvidence(profile.baseCvText, 1200) +
      scoreTextEvidence(profile.experienceHighlights, 500) +
      scoreTextEvidence(profile.projectSummaries, 500)) /
      3
  )
  const workRightScore = profile.workRightDetails.trim()
    ? profile.sponsorshipNeeded
      ? 70
      : 90
    : 15
  const roleFocusScore =
    profile.targetRoles.trim() && profile.targetCountries.trim()
      ? 90
      : profile.targetRoles.trim() || profile.targetCountries.trim()
        ? 55
        : 20
  const cvFactsScore = profile.baseCvText.trim()
    ? scoreTextEvidence(profile.baseCvText, 1000)
    : 10
  const allowedClaimInputs = [
    profile.baseCvText,
    profile.experienceHighlights,
    profile.projectSummaries,
    reusableAnswers.strengthsAnswer,
    reusableAnswers.workAuthorisationAnswer
  ].filter((value) => value.trim().length > 60).length
  const claimBoundaryScore = Math.min(100, allowedClaimInputs * 22)

  return [
    {
      detail:
        evidenceScore >= 75
          ? "Enough saved evidence for job checks."
          : "Add CV text, project examples and experience highlights.",
      label: "Evidence",
      score: evidenceScore,
      status: getSignalStatus(evidenceScore)
    },
    {
      detail:
        workRightScore >= 75
          ? "Work-right details are saved."
          : "Add only verified work-right, sponsorship and relocation facts.",
      label: "Work-right details",
      score: workRightScore,
      status: getSignalStatus(workRightScore)
    },
    {
      detail:
        roleFocusScore >= 75
          ? "Target roles and countries are saved."
          : "Add target roles and countries before checking roles.",
      label: "Role targets",
      score: roleFocusScore,
      status: getSignalStatus(roleFocusScore)
    },
    {
      detail:
        cvFactsScore >= 75
          ? "CV text is saved for fit checks and interview prep."
          : "Paste enough factual CV content to support recommendations.",
      label: "CV",
      score: cvFactsScore,
      status: getSignalStatus(cvFactsScore)
    },
    {
      detail:
        claimBoundaryScore >= 75
          ? "Reusable answer evidence is available."
          : "Add reusable answers only when they are backed by your profile.",
      label: "Reusable answers",
      score: claimBoundaryScore,
      status: getSignalStatus(claimBoundaryScore)
    }
  ]
}
