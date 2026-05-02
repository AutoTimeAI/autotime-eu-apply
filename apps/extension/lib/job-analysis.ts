import type { CandidateProfile, JobAnalysisDraft } from "./storage"

type JobFitRecommendation = NonNullable<JobAnalysisDraft["recommendation"]>

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function cleanDetectedLocation(value = "") {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.;,:\-\s]+$/, "")
    .trim()
}

export function inferLocationFromJobDescription(description: string) {
  const text = description.replace(/\r\n/g, "\n")
  const patterns = [
    /\bLocation\s*[:|-]\s*([^\n]+)/i,
    /\bJob location\s*[:|-]\s*([^\n]+)/i,
    /\bOffice\s*[:|-]\s*([^\n]+)/i,
    /\bBased in\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/i,
    /\b(?:Hybrid|Remote|On-site|Onsite)\s*(?:role|working)?\s*(?:in|from|-\s*)\s*([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const location = cleanDetectedLocation(match?.[1])

    if (location) {
      return location
    }
  }

  if (/\bremote\b/i.test(text) && /\b(?:uk|united kingdom)\b/i.test(text)) {
    return "United Kingdom"
  }

  if (/\bremote\b/i.test(text) && /\b(?:eu|europe|european union)\b/i.test(text)) {
    return "Europe"
  }

  return ""
}

function getRecommendation(score: number): JobFitRecommendation {
  if (score >= 75) {
    return "High Priority"
  }

  if (score >= 55) {
    return "Worth Applying"
  }

  if (score >= 35) {
    return "Stretch"
  }

  return "Skip"
}

function getDetectedSkills(text: string) {
  const skillTerms = [
    ["Requirements analysis", ["requirements", "requirement gathering"]],
    ["Stakeholder management", ["stakeholder", "stakeholders"]],
    ["UAT", ["uat", "user acceptance testing"]],
    ["Payments", ["payment", "payments"]],
    ["FinTech", ["fintech", "bank", "finance", "financial services"]],
    ["Application support", ["application support", "support analyst"]],
    ["Systems analysis", ["systems analyst", "systems analysis"]],
    ["SQL", ["sql"]],
    ["Data analysis", ["data analysis", "reporting", "dashboard"]],
    ["Agile delivery", ["agile", "scrum", "kanban"]],
    ["API integration", ["api", "apis", "integration"]]
  ] as const

  return skillTerms
    .filter(([, terms]) => includesAny(text, [...terms]))
    .map(([skill]) => skill)
}

function getSeniority(text: string) {
  if (includesAny(text, ["head of", "director", "principal"])) {
    return "Leadership"
  }

  if (includesAny(text, ["senior", "lead", "manager"])) {
    return "Senior"
  }

  if (includesAny(text, ["junior", "graduate", "entry level", "associate"])) {
    return "Junior"
  }

  return "Mid-level"
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

  if (recommendation === "High Priority") {
    return "Position around direct role fit, relevant delivery experience, and readiness to contribute quickly."
  }

  return "Position carefully around transferable experience and be explicit about any gaps."
}

function getSummary(draft: JobAnalysisDraft, skills: string[], seniority: string) {
  const role = draft.jobTitle || "This role"
  const company = draft.company ? ` at ${draft.company}` : ""
  const location = draft.location ? ` in ${draft.location}` : ""
  const skillText = skills.length
    ? ` Key signals include ${skills.slice(0, 4).join(", ")}.`
    : ""

  return `${role}${company}${location} appears to be a ${seniority.toLowerCase()} ${draft.workMode} opportunity.${skillText}`
}

function getGaps(
  draft: JobAnalysisDraft,
  profile: CandidateProfile | null,
  text: string,
  skills: string[]
) {
  const gaps: string[] = []

  if (skills.length === 0) {
    gaps.push("No clear skills were detected from the saved job text.")
  }

  if (!draft.jobDescription.trim()) {
    gaps.push("Pasted job description is missing, so requirements may be incomplete.")
  }

  if (includesAny(text, ["senior", "lead", "principal", "head of"])) {
    gaps.push("Seniority may need stronger evidence in the application.")
  }

  if (profile?.sponsorshipNeeded) {
    gaps.push("Sponsorship requirement should be checked before investing heavily.")
  }

  if (profile && profile.relocationWillingness === "no") {
    const profileCountry = profile.currentCountry.toLowerCase()
    const jobLocation = draft.location.toLowerCase()

    if (jobLocation && !jobLocation.includes(profileCountry)) {
      gaps.push("Location may conflict with saved relocation preference.")
    }
  }

  return gaps.length ? gaps : ["No obvious gaps detected from saved data."]
}

export function inferJobFitAnalysis(
  draft: JobAnalysisDraft,
  profile: CandidateProfile | null
): Pick<
  JobAnalysisDraft,
  | "fitScore"
  | "recommendation"
  | "positioningAngle"
  | "scoreFactors"
  | "skills"
  | "seniority"
  | "summary"
  | "gaps"
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
  const skills = unique(getDetectedSkills(text))
  const seniority = getSeniority(text)
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
    scoreFactors: factors,
    skills,
    seniority,
    summary: getSummary(draft, skills, seniority),
    gaps: getGaps(draft, profile, text, skills)
  }
}
