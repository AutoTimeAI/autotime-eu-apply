import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
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
export const appUrl = "https://autotime-eu-apply.vercel.app"
export const BACKEND_AI_URL = `${appUrl}/api/ai`

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

function getOpenAIStatusHint(status: number) {
  if (status === 401) {
    return "sign in to AutoTime and try again."
  }

  if (status === 403) {
    return "check that your AutoTime account has access."
  }

  if (status === 404) {
    return "AutoTime AI is temporarily unavailable."
  }

  if (status === 429) {
    return "rate limit, quota, or billing may need attention."
  }

  if (status >= 500) {
    return "AutoTime AI returned a server error."
  }

  return "try again or use the local fallback."
}

export function getOpenAIErrorMessage(error: unknown) {
  if (error instanceof SyntaxError) {
    return "AutoTime AI returned a response that was not valid JSON."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "AutoTime AI request failed."
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

type ApiEnvelope<T> = {
  data: T | null
  error: string | null
  status: number
}

function hasRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getBackendDataValue<T>(value: unknown, key: string): T {
  if (!hasRecordValue(value) || !(key in value)) {
    throw new Error("AutoTime AI returned an unexpected response.")
  }

  return value[key] as T
}

async function createBackendResponse<T>({
  authToken,
  body,
  endpoint,
  responseKey
}: {
  authToken: string | null
  body: unknown
  endpoint: "analyse" | "content"
  responseKey: "content" | "result"
}): Promise<OpenAIResult<T>> {
  if (!authToken?.trim()) {
    throw new Error("Sign in to AutoTime to use AI.")
  }

  const response = await fetch(`${BACKEND_AI_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(
      `AutoTime AI request failed with ${response.status}; ${getOpenAIStatusHint(
        response.status
      )}`
    )
  }

  const data = (await response.json()) as ApiEnvelope<unknown>

  if (data.error) {
    throw new Error(data.error)
  }

  return {
    value: getBackendDataValue<T>(data.data, responseKey),
    approximateCostUsd: 0
  }
}

export async function generateAIApplicationContentDraft({
  authToken,
  profile,
  job,
  reusableAnswers
}: {
  authToken: string | null
  profile: CandidateProfile
  job: JobAnalysisDraft
  reusableAnswers: ReusableAnswers | null
}) {
  const result = await createBackendResponse<Partial<ApplicationContentDraft>>({
    authToken,
    body: { profile, job, reusableAnswers },
    endpoint: "content",
    responseKey: "content"
  })

  return {
    ...result,
    value: normalizeAIApplicationContent(result.value)
  }
}

export async function generateAIJobAnalysis({
  authToken,
  draft,
  profile
}: {
  authToken: string | null
  draft: JobAnalysisDraft
  profile: CandidateProfile | null
}) {
  const result = await createBackendResponse<Partial<JobAnalysisDraft>>({
    authToken,
    body: { jobAnalysis: draft, profile },
    endpoint: "analyse",
    responseKey: "result"
  })

  return {
    ...result,
    value: normalizeAIJobAnalysis(result.value)
  }
}
