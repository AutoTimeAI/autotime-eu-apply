import type { CandidateProfile, JobAnalysisDraft } from "./storage"

type JobFitRecommendation = NonNullable<JobAnalysisDraft["recommendation"]>

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function getRecommendation(score: number): JobFitRecommendation {
  if (score >= 75) {
    return "strong-fit"
  }

  if (score >= 50) {
    return "possible-fit"
  }

  return "low-fit"
}

function getPositioningAngle(
  text: string,
  recommendation: JobFitRecommendation
) {
  if (includesAny(text, ["fintech", "bank", "payment", "payments"])) {
    return "Position around FinTech systems, application support, and cross-functional delivery."
  }

  if (includesAny(text, ["business analyst", "ba", "requirements"])) {
    return "Position around requirements analysis, stakeholder translation, and delivery clarity."
  }

  if (includesAny(text, ["application", "support", "systems"])) {
    return "Position around application analysis, systems thinking, and operational problem solving."
  }

  if (recommendation === "strong-fit") {
    return "Position around direct role fit, relevant delivery experience, and readiness to contribute quickly."
  }

  return "Position carefully around transferable experience and be explicit about any gaps."
}

export function inferJobFitAnalysis(
  draft: JobAnalysisDraft,
  profile: CandidateProfile | null
): Pick<
  JobAnalysisDraft,
  "fitScore" | "recommendation" | "positioningAngle" | "scoreFactors"
> {
  const text = [
    draft.jobTitle,
    draft.company,
    draft.location,
    draft.workMode,
    draft.jobDescription,
    draft.notes
  ]
    .join(" ")
    .toLowerCase()
  const factors: string[] = []
  let score = 45

  if (
    includesAny(text, [
      "analyst",
      "business analyst",
      "technical ba",
      "systems analyst",
      "application analyst",
      "solutions consultant"
    ])
  ) {
    score += 20
    factors.push(
      "Role title aligns with the target analyst/systems role family."
    )
  } else {
    factors.push("Role title is outside the clearest target role family.")
  }

  if (
    includesAny(text, ["fintech", "bank", "payment", "payments", "finance"])
  ) {
    score += 10
    factors.push(
      "Domain language supports a FinTech or regulated-systems positioning angle."
    )
  }

  if (draft.workMode === "remote" || draft.workMode === "hybrid") {
    score += 10
    factors.push("Work mode supports practical UK/EU application execution.")
  } else if (draft.workMode === "onsite") {
    score -= 5
    factors.push(
      "On-site work mode may need stronger location practicality checks."
    )
  }

  if (profile) {
    const profileCountry = profile.currentCountry.toLowerCase()
    const jobLocation = draft.location.toLowerCase()

    if (jobLocation.includes(profileCountry)) {
      score += 10
      factors.push("Job location matches the saved current country.")
    } else if (profile.relocationWillingness === "yes") {
      score += 5
      factors.push("Location differs, but relocation willingness is positive.")
    } else if (profile.relocationWillingness === "no") {
      score -= 10
      factors.push("Location differs and relocation willingness is set to no.")
    }

    if (profile.sponsorshipNeeded) {
      score -= 10
      factors.push(
        "Sponsorship is needed, so work-right practicality should be checked early."
      )
    } else {
      score += 5
      factors.push("Profile says sponsorship is not needed.")
    }
  } else {
    factors.push(
      "No saved profile was available, so country and work-right fit were not scored."
    )
  }

  if (includesAny(text, ["senior", "lead", "principal", "head of"])) {
    score -= 5
    factors.push("Seniority language may require careful evidence matching.")
  }

  const fitScore = Math.max(0, Math.min(100, score))
  const recommendation = getRecommendation(fitScore)

  return {
    fitScore,
    recommendation,
    positioningAngle: getPositioningAngle(text, recommendation),
    scoreFactors: factors
  }
}
