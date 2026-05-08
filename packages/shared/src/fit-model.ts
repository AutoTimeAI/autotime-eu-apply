import type { CandidateProfile, JobAnalysisDraft } from "./types.ts"

export type CandidateMarketPosition = "foreign-candidate" | "native-candidate"

export type FitComponentKey =
  | "skillMatch"
  | "atsCompatibility"
  | "sponsorshipLikelihood"
  | "rightToWorkCompatibility"
  | "relocationFit"
  | "countryLocationFit"

export type FitComponentStatus = "strong" | "medium" | "weak" | "blocker"

export type FitComponent = {
  key: FitComponentKey
  label: string
  score: number
  status: FitComponentStatus
  rationale: string
}

export type CountryFitDecision =
  | "Apply now"
  | "Stretch application"
  | "Skip for now"
  | "Improve profile first"

export type ContentGenerationGate = "ready" | "stretch" | "blocked"

export type CountryFitEvaluation = {
  overallScore: number
  decision: CountryFitDecision
  confidence: "Low" | "Medium" | "High"
  contentGate: ContentGenerationGate
  positioningAngle: string
  nextBestAction: string
  blockers: string[]
  components: FitComponent[]
  learningPrompt: string
}

type FitContext = {
  candidatePosition: CandidateMarketPosition
  targetCountry: string
}

const componentLabels: Record<FitComponentKey, string> = {
  skillMatch: "Skill match",
  atsCompatibility: "ATS compatibility",
  sponsorshipLikelihood: "Sponsorship likelihood",
  rightToWorkCompatibility: "Right-to-work compatibility",
  relocationFit: "Relocation fit",
  countryLocationFit: "Country/location fit"
}

const signalWords = [
  "requirements",
  "stakeholder",
  "uat",
  "payments",
  "fintech",
  "sql",
  "api",
  "agile",
  "support",
  "systems",
  "reporting",
  "delivery",
  "analysis",
  "product",
  "data",
  "risk",
  "compliance"
]

const hardBlockerKeys: FitComponentKey[] = [
  "sponsorshipLikelihood",
  "rightToWorkCompatibility",
  "relocationFit",
  "countryLocationFit"
]

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getStatus(score: number): FitComponentStatus {
  if (score < 35) {
    return "blocker"
  }

  if (score < 55) {
    return "weak"
  }

  if (score < 75) {
    return "medium"
  }

  return "strong"
}

function hasText(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

function includesAny(value: string, words: string[]) {
  const text = value.toLowerCase()
  return words.some((word) => text.includes(word.toLowerCase()))
}

function getText(profile: CandidateProfile, job: JobAnalysisDraft) {
  return {
    profile: [
      profile.baseCvText,
      profile.experienceHighlights,
      profile.projectSummaries,
      profile.targetRoles,
      profile.workRightDetails
    ]
      .join(" ")
      .toLowerCase(),
    job: [
      job.jobTitle,
      job.company,
      job.location,
      job.jobDescription,
      job.notes,
      job.summary,
      ...(job.skills ?? []),
      ...(job.gaps ?? [])
    ]
      .join(" ")
      .toLowerCase()
  }
}

function component(
  key: FitComponentKey,
  score: number,
  rationale: string
): FitComponent {
  const safeScore = clampScore(score)

  return {
    key,
    label: componentLabels[key],
    score: safeScore,
    status: getStatus(safeScore),
    rationale
  }
}

function getSkillMatch(profileText: string, jobText: string) {
  const jobSignals = signalWords.filter((signal) => jobText.includes(signal))
  const profileSignals = signalWords.filter((signal) =>
    profileText.includes(signal)
  )
  const matched = jobSignals.filter((signal) => profileSignals.includes(signal))

  if (jobSignals.length === 0) {
    return component(
      "skillMatch",
      45,
      "The job description is too thin to compare skill language confidently."
    )
  }

  return component(
    "skillMatch",
    (matched.length / jobSignals.length) * 100,
    matched.length
      ? `Matched ${matched.length} of ${jobSignals.length} visible role signals: ${matched.join(", ")}.`
      : "The saved profile does not yet echo the role's visible skill language."
  )
}

function getAtsCompatibility(profile: CandidateProfile, job: JobAnalysisDraft) {
  const hasRole = includesAny(profile.targetRoles, [job.jobTitle]) ||
    includesAny(job.jobTitle, profile.targetRoles.split(",").map((item) => item.trim()).filter(Boolean))
  const hasCv = hasText(profile.baseCvText)
  const hasSkills = (job.skills?.length ?? 0) >= 3
  const score = 35 + (hasRole ? 25 : 0) + (hasCv ? 25 : 0) + (hasSkills ? 15 : 0)

  return component(
    "atsCompatibility",
    score,
    hasRole
      ? "Target-role language and CV evidence can be aligned for screening."
      : "Target-role language is not clearly aligned with the job title yet."
  )
}

function getSponsorshipLikelihood(
  profile: CandidateProfile,
  jobText: string,
  context: FitContext
) {
  const mentionsSponsorship = includesAny(jobText, [
    "sponsor",
    "sponsorship",
    "visa",
    "skilled worker",
    "work permit"
  ])
  const rejectsSponsorship = includesAny(jobText, [
    "no sponsorship",
    "unable to sponsor",
    "must have right to work",
    "existing right to work",
    "without sponsorship"
  ])
  const needsSponsorship =
    context.candidatePosition === "foreign-candidate" && profile.sponsorshipNeeded

  if (needsSponsorship && rejectsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      15,
      "The role appears to reject sponsorship while the profile says sponsorship is needed."
    )
  }

  if (needsSponsorship && !mentionsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      42,
      "Sponsorship is needed, but the job description does not show a positive sponsorship signal."
    )
  }

  if (needsSponsorship && mentionsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      72,
      "The job mentions visa or sponsorship language, so the path is worth checking."
    )
  }

  return component(
    "sponsorshipLikelihood",
    82,
    "No sponsorship dependency is visible from the saved profile."
  )
}

function getRightToWorkCompatibility(
  profile: CandidateProfile,
  jobText: string,
  context: FitContext
) {
  if (!hasText(profile.workRightDetails)) {
    return component(
      "rightToWorkCompatibility",
      context.candidatePosition === "foreign-candidate" ? 20 : 45,
      "Work-right details are missing, so AutoTime cannot safely recommend applying."
    )
  }

  const profileClaimsRight = includesAny(profile.workRightDetails, [
    "citizen",
    "settled",
    "pre-settled",
    "right to work",
    "work authorisation",
    "work authorization",
    "no sponsorship",
    "do not require sponsorship"
  ])
  const roleRequiresExistingRight = includesAny(jobText, [
    "must have right to work",
    "existing right to work",
    "without sponsorship",
    "no sponsorship"
  ])

  if (roleRequiresExistingRight && !profileClaimsRight) {
    return component(
      "rightToWorkCompatibility",
      28,
      "The role asks for existing work rights, but the profile does not clearly state them."
    )
  }

  return component(
    "rightToWorkCompatibility",
    profileClaimsRight ? 88 : 66,
    profileClaimsRight
      ? "The profile states a work-right position clearly enough for applications."
      : "Work-right details exist, but they should be made more explicit before applying."
  )
}

function getRelocationFit(profile: CandidateProfile, jobText: string) {
  const remoteOrHybrid = includesAny(jobText, ["remote", "hybrid"])
  const onsite = includesAny(jobText, ["onsite", "on-site", "office based"])

  if (profile.relocationWillingness === "no" && onsite) {
    return component(
      "relocationFit",
      30,
      "The profile says no relocation while the role appears office-based."
    )
  }

  if (profile.relocationWillingness === "yes") {
    return component(
      "relocationFit",
      82,
      "Relocation willingness supports applying across the selected market."
    )
  }

  return component(
    "relocationFit",
    remoteOrHybrid ? 74 : 58,
    remoteOrHybrid
      ? "Remote or hybrid language reduces relocation friction."
      : "Relocation is conditional, so location practicality still needs checking."
  )
}

function getCountryLocationFit(
  profile: CandidateProfile,
  job: JobAnalysisDraft,
  context: FitContext
) {
  const targetCountries = profile.targetCountries.toLowerCase()
  const targetCountry = context.targetCountry.toLowerCase()
  const jobLocation = [job.location, job.jobDescription].join(" ").toLowerCase()
  const targetsCountry =
    targetCountries.includes(targetCountry) || jobLocation.includes(targetCountry)

  if (!targetsCountry) {
    return component(
      "countryLocationFit",
      38,
      `The role is not clearly tied to ${context.targetCountry} or the saved target countries.`
    )
  }

  return component(
    "countryLocationFit",
    84,
    `The role aligns with ${context.targetCountry} or the saved target-country list.`
  )
}

function getConfidence(components: FitComponent[]) {
  const blockers = components.filter((item) => item.status === "blocker").length
  const strong = components.filter((item) => item.status === "strong").length

  if (blockers > 0) {
    return "High"
  }

  if (strong >= 3) {
    return "High"
  }

  return strong >= 1 ? "Medium" : "Low"
}

export function evaluateCountryFit({
  profile,
  job,
  context
}: {
  profile: CandidateProfile
  job: JobAnalysisDraft
  context: FitContext
}): CountryFitEvaluation {
  const text = getText(profile, job)
  const components = [
    getSkillMatch(text.profile, text.job),
    getAtsCompatibility(profile, job),
    getSponsorshipLikelihood(profile, text.job, context),
    getRightToWorkCompatibility(profile, text.job, context),
    getRelocationFit(profile, text.job),
    getCountryLocationFit(profile, job, context)
  ]
  const blockers = components
    .filter(
      (item) =>
        item.status === "blocker" && hardBlockerKeys.includes(item.key)
    )
    .map((item) => `${item.label}: ${item.rationale}`)
  const overallScore = clampScore(
    components.reduce((total, item) => total + item.score, 0) / components.length
  )
  const decision: CountryFitDecision =
    blockers.length > 0
      ? "Skip for now"
      : overallScore >= 76
        ? "Apply now"
        : overallScore >= 58
          ? "Stretch application"
          : "Improve profile first"
  const contentGate: ContentGenerationGate =
    decision === "Apply now"
      ? "ready"
      : decision === "Stretch application"
        ? "stretch"
        : "blocked"
  const positioningAngle =
    contentGate === "ready"
      ? "Lead with matched proof, country readiness, and the strongest role-language overlap before writing content."
      : contentGate === "stretch"
        ? "Label this as a stretch: only generate content after the weak country/work-right points are acknowledged."
        : "Do not generate application content yet; resolve the country, work-right, or sponsorship blocker first."
  const nextBestAction =
    contentGate === "ready"
      ? "Save the job, tailor content, then set a follow-up or interview-prep action."
      : contentGate === "stretch"
        ? "Clarify the weakest fit component, then decide whether the strategic value justifies applying."
        : "Fix the blocker before spending time on resume or cover-letter content."

  return {
    overallScore,
    decision,
    confidence: getConfidence(components),
    contentGate,
    positioningAngle,
    nextBestAction,
    blockers,
    components,
    learningPrompt:
      "After the outcome is known, record whether the country/work-right assumption was correct so future recommendations can become stricter or more confident."
  }
}
