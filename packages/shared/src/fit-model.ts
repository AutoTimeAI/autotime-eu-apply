import type {
  AIProvider,
  ApplicationPositioningPack,
  CandidateProfile,
  EUFitEngineResult,
  JobAnalysisDraft,
  ReusableAnswers
} from "./types.ts"
import { getCountryRule, type CountryRule } from "./country-rules.ts"

export const AUTOTIME_FIT_SCORE_DISCLAIMER =
  "This score is a guidance signal based on your provided CV/profile and the job description. It does not guarantee interviews, offers, or employer decisions."

export const AUTOTIME_DEMO_ANALYSIS_LABEL =
  "Sample/demo analysis — not live AI output."

export const AUTOTIME_COMPLIANCE_NOTE =
  "No job, visa, sponsorship, or interview guarantees. AutoTime EU Apply helps users make better application decisions, strengthen positioning, and prepare more effectively."

export const AUTOTIME_OFFICIAL_SOURCE_NOTE =
  "Visa, sponsorship, salary, and country-specific guidance should be verified against official employer, government, or EU sources before making decisions."

export const AUTOTIME_APPLICATION_DRAFT_REVIEW_NOTE =
  "Application drafts should be reviewed and personalised before submission."

export function resolveAIProvider({
  requestedProvider,
  openAIKeyAvailable = false
}: {
  requestedProvider?: AIProvider | null
  openAIKeyAvailable?: boolean
}): AIProvider {
  if (requestedProvider === "openai" && openAIKeyAvailable) {
    return "openai"
  }

  return "mock"
}

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

export type AutoTimeFitLabel =
  | "Strong fit"
  | "Good fit"
  | "Stretch fit"
  | "Low fit"

export type AutoTimeScoreBreakdownItem = {
  key: string
  label: string
  maxPoints: number
  points: number
  rationale: string
}

export type AutoTimeFitReview = {
  fitScore: number
  fitLabel: AutoTimeFitLabel
  confidenceLevel: "Low" | "Medium" | "High"
  scoreBreakdown: AutoTimeScoreBreakdownItem[]
  matchedSignals: string[]
  missingSignals: string[]
  riskAreas: string[]
  suggestedCvPositioning: string
  suggestedNextAction: string
  shortSummary: string
  disclaimer: string
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

const domainSignals = [
  "fintech",
  "payments",
  "banking",
  "insurance",
  "saas",
  "cloud",
  "ai",
  "data",
  "cybersecurity",
  "healthtech",
  "ecommerce",
  "marketplace",
  "climate",
  "energy",
  "public sector",
  "government",
  "devtools",
  "compliance"
]

const senioritySignals = [
  "intern",
  "junior",
  "graduate",
  "mid",
  "senior",
  "lead",
  "principal",
  "manager",
  "head"
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

function clampPoints(score: number, maxPoints: number) {
  return Math.max(0, Math.min(maxPoints, Math.round(score)))
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

function normaliseTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normaliseTextList(item))
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value !== "string") {
    return []
  }

  return value
    .split(/[,;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function tokenise(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2)
}

function unique(items: string[]) {
  return items.filter((item, index, list) => item && list.indexOf(item) === index)
}

function getSharedSignals(source: string, candidates: string[]) {
  const text = source.toLowerCase()
  return unique(
    candidates
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 1 && text.includes(item))
  )
}

function getFitLabel(score: number): AutoTimeFitLabel {
  if (score >= 80) {
    return "Strong fit"
  }

  if (score >= 65) {
    return "Good fit"
  }

  if (score >= 50) {
    return "Stretch fit"
  }

  return "Low fit"
}

function getWeightedComponent({
  key,
  label,
  maxPoints,
  points,
  rationale
}: AutoTimeScoreBreakdownItem): AutoTimeScoreBreakdownItem {
  return {
    key,
    label,
    maxPoints,
    points: clampPoints(points, maxPoints),
    rationale
  }
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

export function evaluateAutoTimeFitScore({
  profile,
  job
}: {
  profile: CandidateProfile
  job: JobAnalysisDraft
}): AutoTimeFitReview {
  const text = getText(profile, job)
  const profileText = text.profile
  const jobText = text.job
  const targetRoles = normaliseTextList(profile.targetRoles)
  const targetCountries = normaliseTextList(profile.targetCountries)
  const roleTokens = tokenise(job.jobTitle)
  const targetRoleMatches = targetRoles.filter(
    (role) =>
      includesAny(job.jobTitle, [role]) ||
      includesAny(role, roleTokens) ||
      includesAny(profileText, roleTokens)
  )
  const roleTitlePoints =
    roleTokens.length === 0
      ? 4
      : targetRoleMatches.length > 0
        ? 18
        : includesAny(profileText, roleTokens)
          ? 14
          : 7

  const jobSkillSignals = unique([
    ...(job.skills ?? []).map((skill) => skill.toLowerCase()),
    ...signalWords.filter((signal) => jobText.includes(signal))
  ])
  const matchedSkillSignals = getSharedSignals(profileText, jobSkillSignals)
  const skillCoverage =
    jobSkillSignals.length > 0
      ? matchedSkillSignals.length / jobSkillSignals.length
      : 0
  const skillPoints =
    jobSkillSignals.length === 0
      ? 8
      : Math.max(5, skillCoverage * 25)

  const jobSeniority = senioritySignals.find((signal) =>
    jobText.includes(signal)
  )
  const profileSeniority = senioritySignals.find((signal) =>
    [profileText, job.seniority ?? ""].join(" ").toLowerCase().includes(signal)
  )
  const seniorityPoints =
    !jobSeniority
      ? 9
      : profileSeniority === jobSeniority
        ? 14
        : profileSeniority
          ? 9
          : 5

  const jobDomainSignals = domainSignals.filter((signal) =>
    jobText.includes(signal)
  )
  const matchedDomainSignals = getSharedSignals(profileText, jobDomainSignals)
  const domainPoints =
    jobDomainSignals.length === 0
      ? 6
      : Math.max(3, (matchedDomainSignals.length / jobDomainSignals.length) * 10)

  const workModeSignal = job.workMode !== "unknown" ? job.workMode : ""
  const locationText = [job.location, job.jobDescription].join(" ")
  const countryMatch =
    targetCountries.length === 0 ||
    targetCountries.some((country) => includesAny(locationText, [country]))
  const workSetupMatch =
    !workModeSignal ||
    includesAny(profileText, [workModeSignal]) ||
    workModeSignal === "remote" ||
    (workModeSignal === "hybrid" && profile.relocationWillingness !== "no")
  const workRightRisk =
    includesAny(jobText, [
      "must have right to work",
      "existing right to work",
      "no sponsorship",
      "without sponsorship",
      "work authorisation",
      "work authorization"
    ]) && !hasText(profile.workRightDetails)
  const locationPoints = workRightRisk
    ? 2
    : countryMatch && workSetupMatch
      ? 9
      : countryMatch || workSetupMatch
        ? 6
        : 3

  const cvEvidenceText = [
    profile.baseCvText,
    profile.experienceHighlights,
    profile.projectSummaries
  ]
    .join(" ")
    .trim()
  const cvEvidencePoints =
    cvEvidenceText.length >= 500
      ? 10
      : cvEvidenceText.length >= 200
        ? 8
        : cvEvidenceText.length >= 80
          ? 5
          : 2

  const hasRoleEvidence = hasText(job.jobTitle) || hasText(job.jobDescription)
  const hasCvEvidence = hasText(profile.baseCvText)
  const hasWorkRightEvidence = hasText(profile.workRightDetails)
  const applicationReadinessPoints =
    (hasRoleEvidence ? 3 : 0) +
    (hasCvEvidence ? 3 : 0) +
    (hasWorkRightEvidence ? 2 : 0) +
    ((job.skills?.length ?? 0) > 0 ? 2 : 0)

  const breakdown = [
    getWeightedComponent({
      key: "roleTitleAlignment",
      label: "Role/title alignment",
      maxPoints: 20,
      points: roleTitlePoints,
      rationale: targetRoleMatches.length
        ? `Target role matches ${targetRoleMatches.slice(0, 2).join(", ")}.`
        : "Target role language is only partially visible in the profile."
    }),
    getWeightedComponent({
      key: "requiredSkillsMatch",
      label: "Required skills match",
      maxPoints: 25,
      points: skillPoints,
      rationale: matchedSkillSignals.length
        ? `Matched ${matchedSkillSignals.length} of ${jobSkillSignals.length} visible skill signals.`
        : "Required skill signals are not strongly mirrored in the saved CV/profile."
    }),
    getWeightedComponent({
      key: "experienceSeniorityMatch",
      label: "Experience/seniority match",
      maxPoints: 15,
      points: seniorityPoints,
      rationale: jobSeniority
        ? `Job seniority signal: ${jobSeniority}; profile signal: ${profileSeniority ?? "not visible"}.`
        : "No clear seniority requirement was found in the job text."
    }),
    getWeightedComponent({
      key: "domainIndustryRelevance",
      label: "Domain/industry relevance",
      maxPoints: 10,
      points: domainPoints,
      rationale: matchedDomainSignals.length
        ? `Matched domain signals: ${matchedDomainSignals.join(", ")}.`
        : "Domain overlap is weak or not explicit from the saved evidence."
    }),
    getWeightedComponent({
      key: "locationWorkSetupMatch",
      label: "Location/work setup match",
      maxPoints: 10,
      points: locationPoints,
      rationale: workRightRisk
        ? "The role appears to require work authorisation, but profile work-right evidence is missing."
        : countryMatch && workSetupMatch
          ? "Target country and work setup look compatible from the provided information."
          : "Location, work setup, or relocation practicality needs review."
    }),
    getWeightedComponent({
      key: "cvEvidenceStrength",
      label: "CV evidence strength",
      maxPoints: 10,
      points: cvEvidencePoints,
      rationale:
        cvEvidencePoints >= 8
          ? "CV/profile evidence is detailed enough to support claims."
          : "CV/profile evidence is thin, so recommendations should stay conservative."
    }),
    getWeightedComponent({
      key: "applicationReadiness",
      label: "Application readiness",
      maxPoints: 10,
      points: applicationReadinessPoints,
      rationale:
        applicationReadinessPoints >= 8
          ? "Core role, CV, work-right, and skill inputs are present."
          : "Some core inputs are missing before this can be treated as application-ready."
    })
  ]

  const penalties = [
    jobSkillSignals.length > 0 && skillCoverage < 0.35
      ? {
          label: "Missing required skill evidence",
          points: 10
        }
      : null,
    workRightRisk
      ? {
          label: "Location/work authorisation mismatch",
          points: 15
        }
      : null,
    jobSeniority && profileSeniority && jobSeniority !== profileSeniority
      ? {
          label: "Seniority mismatch",
          points: 8
        }
      : null,
    cvEvidencePoints <= 5
      ? {
          label: "Weak CV evidence",
          points: 8
        }
      : null
  ].filter(Boolean) as Array<{ label: string; points: number }>

  const rawScore = breakdown.reduce((total, item) => total + item.points, 0)
  const fitScore = clampScore(
    rawScore - penalties.reduce((total, item) => total + item.points, 0)
  )
  const fitLabel = getFitLabel(fitScore)
  const missingSignals = unique([
    ...jobSkillSignals
      .filter((signal) => !matchedSkillSignals.includes(signal))
      .slice(0, 5)
      .map((signal) => `Missing or weak required skill evidence: ${signal}`),
    !targetRoleMatches.length && "Target role/title alignment is not explicit.",
    workRightRisk && "Work-right or sponsorship evidence is missing.",
    cvEvidencePoints <= 5 && "CV evidence is too thin for strong positioning.",
    applicationReadinessPoints < 8 && "Application inputs are incomplete."
  ].filter(Boolean) as string[])
  const matchedSignals = unique([
    ...targetRoleMatches.map((role) => `Role target: ${role}`),
    ...matchedSkillSignals.slice(0, 6).map((skill) => `Skill: ${skill}`),
    ...matchedDomainSignals.slice(0, 4).map((domain) => `Domain: ${domain}`),
    countryMatch && "Target country/location evidence is compatible.",
    cvEvidencePoints >= 8 && "CV evidence is detailed enough for positioning."
  ].filter(Boolean) as string[])
  const riskAreas = unique([
    ...penalties.map((penalty) => `${penalty.label} (-${penalty.points})`),
    fitScore < 50 && "Low fit: do not treat this as a priority application.",
    !hasWorkRightEvidence && "Work-right clarity is missing."
  ].filter(Boolean) as string[])
  const suggestedCvPositioning =
    matchedSignals.length > 0
      ? `Lead with ${matchedSignals.slice(0, 3).join("; ")}. Keep unsupported claims out of the CV.`
      : "Add role-relevant proof to the CV before positioning this application."
  const suggestedNextAction =
    fitScore >= 80
      ? "Save the job, tailor the CV evidence, and prepare application answers."
      : fitScore >= 65
        ? "Apply selectively after strengthening the missing signals."
        : fitScore >= 50
          ? "Treat as a stretch: fix the strongest gaps before applying."
          : "Do not prioritise this role until the missing evidence or blocker is resolved."

  return {
    fitScore,
    fitLabel,
    confidenceLevel:
      hasRoleEvidence && hasCvEvidence && hasWorkRightEvidence
        ? "High"
        : hasRoleEvidence && hasCvEvidence
          ? "Medium"
          : "Low",
    scoreBreakdown: breakdown,
    matchedSignals:
      matchedSignals.length > 0
        ? matchedSignals
        : ["No strong match signal is visible yet."],
    missingSignals:
      missingSignals.length > 0
        ? missingSignals
        : ["No major missing signal was detected from the provided text."],
    riskAreas:
      riskAreas.length > 0
        ? riskAreas
        : ["No serious blocker detected. Still verify employer and official requirements."],
    suggestedCvPositioning,
    suggestedNextAction,
    shortSummary: `${fitLabel}: ${fitScore}/100 based on role alignment, skill evidence, seniority, domain, location/work setup, CV evidence, and readiness.`,
    disclaimer: AUTOTIME_FIT_SCORE_DISCLAIMER
  }
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

function getApplicationPriority(
  score: number
): EUFitEngineResult["applicationPriority"] {
  if (score >= 80) {
    return "High Priority"
  }

  if (score >= 65) {
    return "Worth Applying"
  }

  if (score >= 50) {
    return "Stretch"
  }

  return "Skip"
}

function getComponentText(
  evaluation: CountryFitEvaluation,
  key: FitComponentKey,
  fallback: string
) {
  return evaluation.components.find((item) => item.key === key)?.rationale ?? fallback
}

function getLanguageBarrierScore({
  evaluation,
  job,
  profile
}: {
  evaluation: CountryFitEvaluation
  job: JobAnalysisDraft
  profile: CandidateProfile
}) {
  const countryRuleSignals = evaluation.countryRule.name
    ? evaluation.components
        .find((item) => item.key === "countryLocationFit")
        ?.evidence.join(" ")
        .toLowerCase() ?? ""
    : ""
  const text = [job.location, job.jobDescription, countryRuleSignals]
    .join(" ")
    .toLowerCase()
  const profileText = [
    profile.baseCvText,
    profile.experienceHighlights,
    profile.projectSummaries
  ]
    .join(" ")
    .toLowerCase()
  const visibleLanguageSignals = [
    "german",
    "deutsch",
    "dutch",
    "french",
    "polish",
    "english"
  ].filter((signal) => text.includes(signal))

  if (visibleLanguageSignals.length === 0) {
    return 20
  }

  const matched = visibleLanguageSignals.filter((signal) =>
    profileText.includes(signal)
  )

  return clampScore(80 - (matched.length / visibleLanguageSignals.length) * 55)
}

export function createMockEUFitEngineResult({
  evaluation,
  fitReview,
  job,
  profile,
  provider = "mock",
  officialSourceReviewed = false
}: {
  evaluation: CountryFitEvaluation
  fitReview: AutoTimeFitReview
  job: JobAnalysisDraft
  profile: CandidateProfile
  provider?: AIProvider
  officialSourceReviewed?: boolean
}): EUFitEngineResult {
  const positiveSignals = fitReview.matchedSignals.filter(Boolean)
  const riskSignals = unique([
    ...fitReview.riskAreas,
    ...evaluation.blockers,
    ...fitReview.missingSignals.slice(0, 3)
  ]).filter(Boolean)
  const role = job.jobTitle || "this role"
  const company = job.company || "the employer"
  const officialVerificationStatus = officialSourceReviewed
    ? "user_verified"
    : "needs_official_check"
  const mockPrefix = provider === "mock" ? `${AUTOTIME_DEMO_ANALYSIS_LABEL} ` : ""

  return {
    euFitScore: fitReview.fitScore,
    applyDecision: evaluation.decision,
    bestCountryFit: evaluation.countryRule.name,
    applicationPriority: getApplicationPriority(fitReview.fitScore),
    rightToWorkRealityCheck: getComponentText(
      evaluation,
      "rightToWorkCompatibility",
      "Work-right evidence needs checking against the role and official sources."
    ),
    languageBarrierScore: getLanguageBarrierScore({ evaluation, job, profile }),
    relocationPracticality: getComponentText(
      evaluation,
      "relocationFit",
      "Relocation practicality needs checking before applying."
    ),
    officialVerificationStatus,
    positiveSignals:
      positiveSignals.length > 0
        ? positiveSignals
        : ["No strong positive signal is visible yet."],
    riskSignals:
      riskSignals.length > 0
        ? riskSignals
        : ["No major blocker was detected by the current rules."],
    whyThisRoleFits: [
      fitReview.shortSummary,
      ...positiveSignals.slice(0, 2)
    ].filter(Boolean),
    candidatePositioningGap:
      fitReview.missingSignals[0] ||
      "No single positioning gap is dominant from the saved evidence.",
    bestApplicationAngle: evaluation.positioningAngle,
    recruiterSummaryAngle:
      fitReview.suggestedCvPositioning ||
      `Position the candidate for ${role} at ${company} using only saved evidence.`,
    cvImprovementSuggestion:
      fitReview.suggestedCvPositioning ||
      "Add role-specific proof to the CV before using stronger application claims.",
    interviewReadinessNote:
      fitReview.fitScore >= 65
        ? "Prepare two truthful examples from saved evidence before interview outreach."
        : "Improve evidence and resolve the strongest risk before treating this role as interview-ready.",
    trustNote: `${mockPrefix}${AUTOTIME_OFFICIAL_SOURCE_NOTE}`,
    complianceNote: AUTOTIME_COMPLIANCE_NOTE
  }
}

export function createMockApplicationPositioningPack({
  fitResult,
  job,
  profile,
  provider = "mock",
  reusableAnswers
}: {
  fitResult: EUFitEngineResult
  job: JobAnalysisDraft
  profile: CandidateProfile
  provider?: AIProvider
  reusableAnswers?: Partial<ReusableAnswers>
}): ApplicationPositioningPack {
  const role = job.jobTitle || profile.targetRoles || "this role"
  const company = job.company || "the employer"
  const targetRoles = profile.targetRoles || "relevant roles"
  const strongestEvidence =
    profile.experienceHighlights ||
    profile.projectSummaries ||
    profile.baseCvText.slice(0, 280) ||
    "Add saved evidence before using stronger application claims."
  const motivationAngle =
    reusableAnswers?.motivationAnswer ||
    `Connect ${role} at ${company} to the candidate's target direction in ${targetRoles}, using only verified evidence.`
  const strengthsAngle =
    reusableAnswers?.strengthsAnswer ||
    `Lead with the strongest saved proof: ${strongestEvidence}`
  const providerLabel =
    provider === "mock"
      ? "Local/template-based draft — not live AI-refined. "
      : ""

  return {
    recruiterSummaryAngle: fitResult.recruiterSummaryAngle,
    bestApplicationAngle: fitResult.bestApplicationAngle,
    cvImprovementSuggestion: fitResult.cvImprovementSuggestion,
    coverLetterAngle: [
      `Open with a direct application for ${role} at ${company}.`,
      fitResult.bestApplicationAngle,
      "Keep work-right, sponsorship and relocation wording factual and verifiable."
    ].join(" "),
    motivationAnswerAngle: motivationAngle,
    strengthsAnswerAngle: strengthsAngle,
    interviewReadinessNote: fitResult.interviewReadinessNote,
    followUpSuggestion:
      fitResult.applyDecision === "Apply now"
        ? "After submitting, set a follow-up reminder and prepare two evidence-backed interview examples."
        : "Resolve the strongest fit or evidence gap before submitting or following up.",
    trustNote: `${providerLabel}${fitResult.trustNote}`,
    complianceNote: `${fitResult.complianceNote} ${AUTOTIME_APPLICATION_DRAFT_REVIEW_NOTE}`
  }
}
