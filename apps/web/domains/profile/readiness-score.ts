import type { CandidateProfile, CompanionDashboardState, ReusableAnswers } from "shared"

export function getReadinessScore(state: CompanionDashboardState) {
  return getProfileReadinessScore(state.profile, state.reusableAnswers)
}

export function getProfileReadinessScore(
  profile: CandidateProfile,
  reusableAnswers: Partial<ReusableAnswers> = {}
) {
  const requiredProfileSignals = [
    profile.fullName.trim(),
    profile.currentCountry.trim(),
    profile.targetCountries.trim(),
    profile.targetRoles.trim(),
    profile.workRightDetails.trim(),
    profile.baseCvText.trim()
  ]
  const reusableSignals = [
    reusableAnswers.motivationAnswer?.trim() ?? "",
    reusableAnswers.strengthsAnswer?.trim() ?? ""
  ]
  const requiredCompleted = requiredProfileSignals.filter(Boolean).length
  const reusableCompleted = reusableSignals.filter(Boolean).length

  return Math.min(
    100,
    Math.round(
      (requiredCompleted / requiredProfileSignals.length) * 90 +
        (reusableCompleted / reusableSignals.length) * 10
    )
  )
}
