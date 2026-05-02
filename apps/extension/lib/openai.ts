import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
  OpenAISettings,
  ReusableAnswers
} from "./storage"

type OpenAIUsage = {
  input_tokens?: number
  output_tokens?: number
}

type ResponseOutputText = {
  type: "output_text"
  text: string
}

type ResponseOutputMessage = {
  type: "message"
  content?: ResponseOutputText[]
}

type OpenAIResponse = {
  output?: ResponseOutputMessage[]
  output_text?: string
  usage?: OpenAIUsage
}

export type OpenAIResult<T> = {
  value: T
  approximateCostUsd: number
}

export const fallbackOpenAICallBudgetUsd = 0.01

const modelPricesPerMillionTokens: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 }
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

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function toRecommendation(value: unknown): JobAnalysisDraft["recommendation"] {
  return value === "High Priority" ||
    value === "Worth Applying" ||
    value === "Stretch" ||
    value === "Skip"
    ? value
    : "Stretch"
}

export function normalizeAIApplicationContent(
  value: Partial<ApplicationContentDraft>
): ApplicationContentDraft {
  return {
    coverLetter: toStringValue(value.coverLetter),
    profileSummary: toStringValue(value.profileSummary),
    motivationAnswer: toStringValue(value.motivationAnswer),
    strengthsAnswer: toStringValue(value.strengthsAnswer),
    availabilityAnswer: toStringValue(value.availabilityAnswer)
  }
}

export function normalizeAIJobAnalysis(
  value: Partial<JobAnalysisDraft>
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
  const fitScore =
    typeof value.fitScore === "number"
      ? Math.max(0, Math.min(100, value.fitScore))
      : 50

  return {
    fitScore,
    recommendation: toRecommendation(value.recommendation),
    positioningAngle: toStringValue(value.positioningAngle),
    scoreFactors: toStringArray(value.scoreFactors),
    skills: toStringArray(value.skills),
    seniority: toStringValue(value.seniority),
    summary: toStringValue(value.summary),
    gaps: toStringArray(value.gaps)
  }
}

export function estimateOpenAICostUsd(model: string, usage?: OpenAIUsage) {
  const prices =
    modelPricesPerMillionTokens[model] ?? modelPricesPerMillionTokens["gpt-4.1-mini"]
  const inputTokens = usage?.input_tokens ?? 0
  const outputTokens = usage?.output_tokens ?? 0

  const estimatedCost =
    (inputTokens / 1_000_000) * prices.input +
    (outputTokens / 1_000_000) * prices.output

  return Number(estimatedCost.toFixed(6))
}

async function createResponse<T>(
  settings: OpenAISettings,
  instructions: string,
  input: unknown
): Promise<OpenAIResult<T>> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      instructions,
      input: JSON.stringify(input),
      max_output_tokens: 1200
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`)
  }

  const data = (await response.json()) as OpenAIResponse

  return {
    value: parseJsonObject<T>(getOutputText(data)),
    approximateCostUsd: estimateOpenAICostUsd(settings.model, data.usage)
  }
}

export async function generateAIApplicationContentDraft({
  settings,
  profile,
  job,
  reusableAnswers
}: {
  settings: OpenAISettings
  profile: CandidateProfile
  job: JobAnalysisDraft
  reusableAnswers: ReusableAnswers | null
}) {
  const result = await createResponse<Partial<ApplicationContentDraft>>(
    settings,
    [
      "You write concise, truthful UK/EU job application content.",
      "Return only valid JSON with keys coverLetter, profileSummary, motivationAnswer, strengthsAnswer, availabilityAnswer.",
      "Do not invent employers, credentials, degrees, work rights, salary, or relocation facts.",
      "Use the candidate profile and job analysis. Keep outputs editable and specific."
    ].join(" "),
    { profile, job, reusableAnswers }
  )

  return {
    ...result,
    value: normalizeAIApplicationContent(result.value)
  }
}

export async function generateAIJobAnalysis({
  settings,
  draft,
  profile
}: {
  settings: OpenAISettings
  draft: JobAnalysisDraft
  profile: CandidateProfile | null
}) {
  const result = await createResponse<Partial<JobAnalysisDraft>>(
    settings,
    [
      "You analyse UK/EU job fit for a tech candidate.",
      "Return only valid JSON with fitScore number 0-100, recommendation one of High Priority, Worth Applying, Stretch, Skip, positioningAngle string, scoreFactors string array, skills string array, seniority string, summary string, gaps string array.",
      "Be conservative. Do not infer facts not present in the profile or job text."
    ].join(" "),
    { draft, profile }
  )

  return {
    ...result,
    value: normalizeAIJobAnalysis(result.value)
  }
}
