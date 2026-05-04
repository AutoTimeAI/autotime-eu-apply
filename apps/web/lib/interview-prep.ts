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
  const now = options.now ?? getTimestamp()
  const role = application.roleTitle || job.jobTitle || "the role"
  const company = application.company || job.company || "the company"
  const skills = job.skills?.length
    ? job.skills
    : ["requirements analysis", "stakeholder management", "delivery"]

  return {
    id: options.id ?? getId(),
    applicationId: application.id,
    roleSummary: `${role} at ${company} needs clear analysis, delivery judgement and evidence that maps to the saved job description.`,
    positioningStatement:
      job.positioningAngle ||
      `Position ${profile.fullName || "the candidate"} around systems thinking, truthful experience and practical delivery impact.`,
    fitAndGapRecap: [
      job.summary || `${role} is currently scored at ${job.fitScore ?? 0}%.`,
      ...(job.gaps ?? [])
    ].join(" "),
    likelyQuestions: [
      `Why are you interested in ${role} at ${company}?`,
      "Walk us through a requirements problem you clarified.",
      "How do you handle conflicting stakeholder priorities?",
      "Describe a UAT or delivery issue you helped resolve.",
      "What would you check first in the first 30 days?"
    ],
    starAnswerPrompts: [
      "Use a real requirements or UAT example: situation, task, action, measurable result.",
      "Use a stakeholder-management example where you translated ambiguity into a clear next step.",
      "Use an operational support or incident example only if it is truthful and relevant."
    ],
    projectTalkingPoints: [
      profile.projectSummaries ||
        "Explain AutoTime as a practical MVP focused on job analysis, content quality and tracking.",
      "Connect any FinTech project discussion to resilience, risk, SLA visibility and stakeholder communication."
    ],
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
      "Prepare two truthful STAR examples.",
      "Check commute, hybrid expectations and work-right details.",
      "Prepare questions for the employer.",
      "Keep salary and notice-period answers consistent with saved profile data."
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
        "Do not invent experience, employers, degrees, certifications, work rights, salary, relocation facts, or outcomes."
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
