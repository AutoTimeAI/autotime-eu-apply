import type { CandidateProfile, JobAnalysisDraft } from "./types.ts"
import { getCountryRule, type CountryRule } from "./country-rules.ts"

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
  evidence: string[]
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
  countryRule: {
    code: string
    name: string
    marketNote: string
    sponsorshipStrictness: CountryRule["sponsorshipStrictness"]
    relocationFriction: CountryRule["relocationFriction"]
  }
  positioningAngle: string
  nextBestAction: string
  blockers: string[]
  evidenceChecklist: string[]
  components: FitComponent[]
  learningPrompt: string
}

type FitContext = {
  candidatePosition: CandidateMarketPosition
  targetCountry: string
  outcomeSignals?: OutcomeLearningSignals
}

export type OutcomeLearningSignals = {
  totalTracked: number
  interviews: number
  sponsorshipBlocks: number
  workRightBlocks: number
  noResponses: number
  positiveOutcomes: number
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
  if (!value.trim()) {
    return false
  }

  const text = value.toLowerCase()
  return words
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .some((word) => text.includes(word))
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
  rationale: string,
  evidence: string[] = []
): FitComponent {
  const safeScore = clampScore(score)

  return {
    key,
    label: componentLabels[key],
    score: safeScore,
    status: getStatus(safeScore),
    rationale,
    evidence
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
      0,
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
  if (!hasText(profile.baseCvText) || !hasText(job.jobTitle)) {
    return component(
      "atsCompatibility",
      15,
      "CV text and job title are required before screening compatibility can be checked."
    )
  }

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
  context: FitContext,
  rule: CountryRule
) {
  const mentionsSponsorship = includesAny(jobText, [
    "sponsor",
    "sponsorship",
    "visa",
    "skilled worker",
    "work permit",
    ...rule.positiveSponsorshipSignals
  ])
  const rejectsSponsorship = includesAny(jobText, [
    "no sponsorship",
    "unable to sponsor",
    "must have right to work",
    "existing right to work",
    "without sponsorship",
    ...rule.negativeSponsorshipSignals
  ])
  const needsSponsorship =
    context.candidatePosition === "foreign-candidate" && profile.sponsorshipNeeded
  const strictnessPenalty =
    rule.sponsorshipStrictness === "strict"
      ? 8
      : rule.sponsorshipStrictness === "open"
        ? -6
        : 0
  const learnedPenalty = Math.min(
    10,
    (context.outcomeSignals?.sponsorshipBlocks ?? 0) * 3
  )

  if (needsSponsorship && rejectsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      15,
      "The role appears to reject sponsorship while the profile says sponsorship is needed.",
      ["Negative sponsorship language was detected in the job text."]
    )
  }

  if (
    context.candidatePosition === "foreign-candidate" &&
    !hasText(profile.workRightDetails)
  ) {
    return component(
      "sponsorshipLikelihood",
      35 - strictnessPenalty - learnedPenalty,
      "Sponsorship status is not verified because work-right details are missing.",
      rule.evidencePrompts.filter((item) =>
        item.toLowerCase().includes("sponsor")
      )
    )
  }

  if (needsSponsorship && !mentionsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      42 - strictnessPenalty - learnedPenalty,
      `${rule.name} sponsorship is not proven from the role text, so this needs manual confirmation before content generation.`,
      [
        rule.marketNote,
        ...rule.evidencePrompts.filter((item) =>
          item.toLowerCase().includes("sponsor")
        )
      ]
    )
  }

  if (needsSponsorship && mentionsSponsorship) {
    return component(
      "sponsorshipLikelihood",
      72 - Math.max(strictnessPenalty, 0),
      "The job mentions visa, permit, sponsorship, or relocation-support language, so the path is worth checking.",
      ["Positive sponsorship or visa-support language was detected."]
    )
  }

  return component(
    "sponsorshipLikelihood",
    82 + (rule.sponsorshipStrictness === "open" ? 4 : 0),
    "No sponsorship dependency is visible from the saved profile.",
    ["Profile says sponsorship is not currently required."]
  )
}

function getRightToWorkCompatibility(
  profile: CandidateProfile,
  jobText: string,
  context: FitContext,
  rule: CountryRule
) {
  if (!hasText(profile.workRightDetails)) {
    return component(
      "rightToWorkCompatibility",
      context.candidatePosition === "foreign-candidate" ? 20 : 45,
      "Work-right details are missing, so AutoTime cannot safely recommend applying.",
      rule.evidencePrompts
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
    "do not require sponsorship",
    ...rule.workRightSignals
  ])
  const roleRequiresExistingRight = includesAny(jobText, [
    "must have right to work",
    "existing right to work",
    "without sponsorship",
    "no sponsorship",
    ...rule.negativeSponsorshipSignals
  ])
  const learnedPenalty = Math.min(
    10,
    (context.outcomeSignals?.workRightBlocks ?? 0) * 4
  )

  if (roleRequiresExistingRight && !profileClaimsRight) {
    return component(
      "rightToWorkCompatibility",
      28,
      "The role asks for existing work rights, but the profile does not clearly state them.",
      ["Job text appears to require existing work authorisation."]
    )
  }

  return component(
    "rightToWorkCompatibility",
    profileClaimsRight ? 88 - learnedPenalty : 66 - learnedPenalty,
    profileClaimsRight
      ? "The profile states a work-right position clearly enough for applications."
      : "Work-right details exist, but they should be made more explicit before applying.",
    profileClaimsRight
      ? [`Profile contains work-right language aligned to ${rule.name}.`]
      : rule.evidencePrompts
  )
}

function getRelocationFit(
  profile: CandidateProfile,
  jobText: string,
  rule: CountryRule
) {
  const remoteOrHybrid = includesAny(jobText, ["remote", "hybrid"])
  const onsite = includesAny(jobText, ["onsite", "on-site", "office based"])
  const frictionPenalty =
    rule.relocationFriction === "high"
      ? 8
      : rule.relocationFriction === "low"
        ? -5
        : 0

  if (profile.relocationWillingness === "no" && onsite) {
    return component(
      "relocationFit",
      30,
      "The profile says no relocation while the role appears office-based.",
      ["Onsite or office-based language was detected."]
    )
  }

  if (profile.relocationWillingness === "yes") {
    return component(
      "relocationFit",
      82 - Math.max(frictionPenalty, 0),
      "Relocation willingness supports applying across the selected market.",
      [`${rule.name} relocation friction is treated as ${rule.relocationFriction}.`]
    )
  }

  return component(
    "relocationFit",
    remoteOrHybrid ? 74 - Math.max(frictionPenalty, 0) : 58 - frictionPenalty,
    remoteOrHybrid
      ? "Remote or hybrid language reduces relocation friction."
      : "Relocation is conditional, so location practicality still needs checking.",
    remoteOrHybrid
      ? ["Remote or hybrid signal was detected."]
      : rule.evidencePrompts
  )
}

function getCountryLocationFit(
  profile: CandidateProfile,
  job: JobAnalysisDraft,
  context: FitContext,
  rule: CountryRule
) {
  const targetCountries = profile.targetCountries.toLowerCase()
  const targetCountry = context.targetCountry.toLowerCase()
  const jobLocation = [job.location, job.jobDescription].join(" ").toLowerCase()
  const targetsCountry =
    targetCountries.includes(targetCountry) ||
    jobLocation.includes(targetCountry) ||
    rule.locationSignals.some((signal) => jobLocation.includes(signal))
  const languageRisk =
    rule.languageSignals.length > 0 &&
    includesAny(jobLocation, rule.languageSignals) &&
    !includesAny(
      [
        profile.baseCvText,
        profile.experienceHighlights,
        profile.projectSummaries
      ].join(" "),
      rule.languageSignals
    )

  if (!targetsCountry) {
    return component(
      "countryLocationFit",
      38,
      `The role is not clearly tied to ${context.targetCountry} or the saved target countries.`,
      [`Expected country evidence for ${rule.name}.`]
    )
  }

  if (languageRisk) {
    return component(
      "countryLocationFit",
      52,
      `${rule.name} language expectations are visible in the role, but matching language evidence is not visible in the profile.`,
      [`Detected language signal: ${rule.languageSignals.join(", ")}.`]
    )
  }

  return component(
    "countryLocationFit",
    84,
    `The role aligns with ${context.targetCountry} or the saved target-country list.`,
    [`Role location matches ${rule.name} or the saved target-country list.`]
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
  const rule = getCountryRule(context.targetCountry)
  const components = [
    getSkillMatch(text.profile, text.job),
    getAtsCompatibility(profile, job),
    getSponsorshipLikelihood(profile, text.job, context, rule),
    getRightToWorkCompatibility(profile, text.job, context, rule),
    getRelocationFit(profile, text.job, rule),
    getCountryLocationFit(profile, job, context, rule)
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
  const evidenceChecklist = [
    rule.marketNote,
    ...rule.evidencePrompts,
    ...components.flatMap((item) => item.evidence)
  ].filter((item, index, list) => item && list.indexOf(item) === index)

  return {
    overallScore,
    decision,
    confidence: getConfidence(components),
    contentGate,
    countryRule: {
      code: rule.code,
      name: rule.name,
      marketNote: rule.marketNote,
      sponsorshipStrictness: rule.sponsorshipStrictness,
      relocationFriction: rule.relocationFriction
    },
    positioningAngle,
    nextBestAction,
    blockers,
    evidenceChecklist,
    components,
    learningPrompt:
      (context.outcomeSignals?.totalTracked ?? 0) > 0
        ? "Outcome history is now part of this judgment. Record sponsorship, work-right and interview results so future recommendations become stricter where needed."
        : "After the outcome is known, record whether the country/work-right assumption was correct so future recommendations can become stricter or more confident."
  }
}
