import type {
  ApplicationRecord,
  CandidateProfile,
  InterviewPrepPack,
  JobAnalysisDraft,
  ReusableAnswers
} from "shared"

export type WebAISettings = {
  apiKey: string
  model: string
  monthlyBudgetUsd: number
  usedBudgetUsd: number
}

type OpenAIUsage = {
  input_tokens?: number
  output_tokens?: number
}

type OpenAIResponse = {
  output?: Array<{
    type: "message"
    content?: Array<{ type: "output_text"; text: string }>
  }>
  output_text?: string
  usage?: OpenAIUsage
}

type PrepPackOptions = {
  id?: string
  now?: string
}

export type InterviewPrepGuardrailResult = {
  ready: boolean
  blockers: string[]
  warnings: string[]
  evidence: string[]
  limits: string[]
}

export class InterviewPrepGuardrailError extends Error {
  guardrails: InterviewPrepGuardrailResult

  constructor(guardrails: InterviewPrepGuardrailResult) {
    super(`Interview prep blocked: ${guardrails.blockers.join(" ")}`)
    this.name = "InterviewPrepGuardrailError"
    this.guardrails = guardrails
  }
}

const modelPricesPerMillionTokens: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 }
}

export const defaultWebAISettings: WebAISettings = {
  apiKey: "",
  model: "gpt-4.1-mini",
  monthlyBudgetUsd: 2,
  usedBudgetUsd: 0
}

export const fallbackOpenAIInterviewBudgetUsd = 0.01

function getId() {
  return crypto.randomUUID()
}

function getTimestamp() {
  return new Date().toISOString()
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function hasMeaningfulText(value: unknown, minLength = 20) {
  return cleanText(value).replace(/\s+/g, " ").length >= minLength
}

function addIfMeaningful(items: string[], label: string, value: unknown) {
  const text = cleanText(value)

  if (text) {
    items.push(`${label}: ${text}`)
  }
}

function getProfileEvidence(profile: CandidateProfile) {
  const evidence: string[] = []

  addIfMeaningful(evidence, "Target roles", profile.targetRoles)
  addIfMeaningful(evidence, "Current location", profile.currentCountry)
  addIfMeaningful(evidence, "Target countries", profile.targetCountries)
  addIfMeaningful(evidence, "CV evidence", profile.baseCvText)
  addIfMeaningful(evidence, "Experience evidence", profile.experienceHighlights)
  addIfMeaningful(evidence, "Project evidence", profile.projectSummaries)
  addIfMeaningful(evidence, "Work-right evidence", profile.workRightDetails)
  addIfMeaningful(evidence, "Notice period", profile.noticePeriod)

  return evidence
}

function getJobEvidence(
  application: ApplicationRecord,
  job: JobAnalysisDraft
) {
  const evidence: string[] = []

  addIfMeaningful(evidence, "Saved role", application.roleTitle || application.title)
  addIfMeaningful(evidence, "Saved company", application.company)
  addIfMeaningful(evidence, "Saved application note", application.notes)
  addIfMeaningful(evidence, "Job title", job.jobTitle)
  addIfMeaningful(evidence, "Company", job.company)
  addIfMeaningful(evidence, "Job description", job.jobDescription)
  addIfMeaningful(evidence, "Analysis summary", job.summary)
  addIfMeaningful(evidence, "Positioning angle", job.positioningAngle)

  if (job.skills?.length) {
    evidence.push(`Saved skills: ${job.skills.join(", ")}`)
  }

  if (job.gaps?.length) {
    evidence.push(`Known gaps: ${job.gaps.join(", ")}`)
  }

  return evidence
}

export function getInterviewPrepGuardrails({
  application,
  job,
  profile
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  profile: CandidateProfile
}): InterviewPrepGuardrailResult {
  const blockers: string[] = []
  const warnings: string[] = []
  const limits: string[] = [
    "General career preparation only; this is not immigration, legal or hiring advice.",
    "Use only evidence saved in the profile, job analysis and application notes.",
    "Replace any placeholder prompt with a real example before using it in an interview."
  ]
  const role = cleanText(application.roleTitle || application.title || job.jobTitle)
  const company = cleanText(application.company || job.company)
  const profileEvidence = getProfileEvidence(profile)
  const jobEvidence = getJobEvidence(application, job)
  const candidateProofCount = [
    hasMeaningfulText(profile.baseCvText, 35),
    hasMeaningfulText(profile.experienceHighlights, 25),
    hasMeaningfulText(profile.projectSummaries, 25)
  ].filter(Boolean).length
  const jobProofCount = [
    hasMeaningfulText(job.jobDescription, 35),
    hasMeaningfulText(job.summary, 25),
    hasMeaningfulText(job.positioningAngle, 25),
    Boolean(job.skills?.length && job.skills.length >= 2),
    hasMeaningfulText(application.notes, 20)
  ].filter(Boolean).length

  if (application.status !== "Interview") {
    blockers.push("Move this application to Interview before generating prep.")
  }

  if (!role) {
    blockers.push("Add the role title before generating prep.")
  }

  if (!company) {
    blockers.push("Add the company name before generating prep.")
  }

  if (candidateProofCount < 2) {
    blockers.push(
      "Add at least two candidate evidence sources: CV text, experience highlights, or project summaries."
    )
  }

  if (jobProofCount < 2) {
    blockers.push(
      "Add stronger job evidence: job description, analysis summary, positioning angle, saved skills, or application notes."
    )
  }

  if (!hasMeaningfulText(profile.workRightDetails, 8)) {
    warnings.push(
      "Work-right details are missing, so prep must not make visa or authorisation claims."
    )
  }

  if (!hasMeaningfulText(profile.salaryExpectation, 2)) {
    warnings.push("Salary expectation is missing; keep salary answers general.")
  }

  if (!hasMeaningfulText(profile.noticePeriod, 2)) {
    warnings.push("Notice period is missing; keep availability answers general.")
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    evidence: [...profileEvidence, ...jobEvidence],
    limits
  }
}

export function assertInterviewPrepReady({
  application,
  job,
  profile
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  profile: CandidateProfile
}) {
  const guardrails = getInterviewPrepGuardrails({ application, job, profile })

  if (!guardrails.ready) {
    throw new InterviewPrepGuardrailError(guardrails)
  }

  return guardrails
}

function getOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text)
      .join("") ?? ""
  )
}

function parseJsonObject<T>(text: string): T {
  const trimmed = text.trim()
  const json = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed
  return JSON.parse(json) as T
}

function getOpenAIStatusHint(status: number) {
  if (status === 401) {
    return "check that the saved API key is valid."
  }

  if (status === 403) {
    return "check project permissions for the saved API key."
  }

  if (status === 404) {
    return "check that the selected model is available."
  }

  if (status === 429) {
    return "rate limit, quota, or billing may need attention."
  }

  if (status >= 500) {
    return "OpenAI service returned a server error."
  }

  return "check AI settings and try again."
}

export function getAIInterviewErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "OpenAI returned a response that was not valid JSON."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "OpenAI interview prep request failed."
}

export function canUseWebAI(settings: WebAISettings) {
  return (
    settings.apiKey.trim() !== "" &&
    settings.usedBudgetUsd + fallbackOpenAIInterviewBudgetUsd <=
      settings.monthlyBudgetUsd
  )
}

export function estimateOpenAIInterviewCostUsd(
  model: string,
  usage?: OpenAIUsage
) {
  const prices =
    modelPricesPerMillionTokens[model] ?? modelPricesPerMillionTokens["gpt-4.1-mini"]
  const inputTokens = usage?.input_tokens ?? 0
  const outputTokens = usage?.output_tokens ?? 0

  const estimatedCost =
    (inputTokens / 1_000_000) * prices.input +
    (outputTokens / 1_000_000) * prices.output

  return Number(estimatedCost.toFixed(6))
}

export function createLocalInterviewPrepPack(
  application: ApplicationRecord,
  profile: CandidateProfile,
  job: JobAnalysisDraft,
  options: PrepPackOptions = {}
): InterviewPrepPack {
  const guardrails = assertInterviewPrepReady({ application, job, profile })
  const now = options.now ?? getTimestamp()
  const role = application.roleTitle || job.jobTitle || "the role"
  const company = application.company || job.company || "the company"
  const skills = job.skills?.length ? job.skills : ["Review saved job evidence"]
  const profileEvidence = getProfileEvidence(profile).slice(0, 4)
  const projectTalkingPoints = profile.projectSummaries
    ? [
        `Use only this saved project evidence: ${profile.projectSummaries}`,
        "Explain your role, action and result only where the saved profile supports it."
      ]
    : [
        "Add a real project example before discussing project work in the interview."
      ]

  return {
    id: options.id ?? getId(),
    applicationId: application.id,
    roleSummary: `${role} at ${company} is ready for interview prep because the saved profile and job record contain enough evidence to prepare without inventing claims.`,
    positioningStatement:
      job.positioningAngle ||
      `Position ${profile.fullName || "the candidate"} only around the saved evidence: ${profileEvidence.join(" ")}`,
    fitAndGapRecap: [
      job.summary || `${role} is currently saved with fit score ${job.fitScore ?? 0}%.`,
      ...(job.gaps ?? [])
    ].join(" "),
    likelyQuestions: [
      `Why are you interested in ${role} at ${company}?`,
      "Which saved experience from your profile best proves you can do this role?",
      "What job requirement do you meet most clearly, and what evidence supports it?",
      "Where is your fit weaker, and how would you explain that honestly?",
      "What would you check first in the first 30 days?"
    ],
    starAnswerPrompts: [
      "Use a real example from saved CV or experience notes: situation, task, action, result.",
      "If the saved profile does not prove the example, write 'evidence missing' and add the missing detail first.",
      "Do not add numbers, employers, tools, certifications or outcomes unless they are saved evidence."
    ],
    projectTalkingPoints,
    skillsToRevise: skills.slice(0, 8),
    questionsToAskEmployer: [
      "What are the most important outcomes for this role in the first quarter?",
      "Which systems or teams would this role work with most often?",
      "Where do requirements currently get stuck or lose clarity?",
      "How do you measure successful delivery for this team?",
      "What would make someone excellent in this role?"
    ],
    finalPrepChecklist: [
      "Review the saved job description and positioning angle.",
      "Prepare two truthful STAR examples using saved evidence only.",
      "Check commute, hybrid expectations and work-right details against official sources.",
      "Prepare questions for the employer.",
      "Keep salary and notice-period answers consistent with saved profile data.",
      ...guardrails.warnings,
      ...guardrails.limits
    ],
    createdAt: now,
    updatedAt: now
  }
}

export function normalizeAIInterviewPrepPack(
  value: Partial<InterviewPrepPack>,
  fallback: InterviewPrepPack,
  options: PrepPackOptions = {}
): InterviewPrepPack {
  const now = options.now ?? fallback.updatedAt

  return {
    id: options.id ?? fallback.id,
    applicationId: fallback.applicationId,
    roleSummary: toStringValue(value.roleSummary) || fallback.roleSummary,
    positioningStatement:
      toStringValue(value.positioningStatement) || fallback.positioningStatement,
    fitAndGapRecap: toStringValue(value.fitAndGapRecap) || fallback.fitAndGapRecap,
    likelyQuestions: toStringArray(value.likelyQuestions),
    starAnswerPrompts: toStringArray(value.starAnswerPrompts),
    projectTalkingPoints: toStringArray(value.projectTalkingPoints),
    skillsToRevise: toStringArray(value.skillsToRevise),
    questionsToAskEmployer: toStringArray(value.questionsToAskEmployer),
    finalPrepChecklist: toStringArray(value.finalPrepChecklist),
    createdAt: fallback.createdAt,
    updatedAt: now
  }
}

export async function generateAIInterviewPrepPack({
  settings,
  application,
  profile,
  reusableAnswers,
  job,
  fallbackPack,
  fetchImpl = fetch
}: {
  settings: WebAISettings
  application: ApplicationRecord
  profile: CandidateProfile
  reusableAnswers: ReusableAnswers
  job: JobAnalysisDraft
  fallbackPack: InterviewPrepPack
  fetchImpl?: typeof fetch
}) {
  assertInterviewPrepReady({ application, job, profile })

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      instructions: [
        "You create truthful UK/EU job interview preparation packs.",
        "Return only valid JSON with keys roleSummary, positioningStatement, fitAndGapRecap, likelyQuestions, starAnswerPrompts, projectTalkingPoints, skillsToRevise, questionsToAskEmployer, finalPrepChecklist.",
        "All list keys must be string arrays.",
        "Use only the supplied candidate profile, reusable answers, job analysis and application record.",
        "Do not invent experience, employers, degrees, certifications, work rights, salary, relocation facts, or outcomes.",
        "If a claim has no supplied evidence, state that evidence is missing instead of writing the claim.",
        "STAR prompts must ask the user to supply truthful examples; do not fabricate complete stories.",
        "No immigration or legal advice. For work-right questions, keep it general and tell the user to check official sources or a qualified adviser."
      ].join(" "),
      input: JSON.stringify({ profile, reusableAnswers, job, application }),
      max_output_tokens: 1400
    })
  })

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed with ${response.status}; ${getOpenAIStatusHint(
        response.status
      )}`
    )
  }

  const data = (await response.json()) as OpenAIResponse
  const parsed = parseJsonObject<Partial<InterviewPrepPack>>(getOutputText(data))

  return {
    value: normalizeAIInterviewPrepPack(parsed, fallbackPack, {
      now: getTimestamp()
    }),
    approximateCostUsd: estimateOpenAIInterviewCostUsd(settings.model, data.usage)
  }
}
