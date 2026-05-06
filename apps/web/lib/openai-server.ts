import OpenAI from "openai"
import { z } from "zod"
import { getServerEnv } from "./env"
import { createLocalInterviewPrepPack } from "./interview-prep"
import type {
  ApplicationContentDraft,
  ApplicationRecord,
  CandidateProfile,
  InterviewPrepPack,
  JobAnalysisDraft,
  ReusableAnswers
} from "shared"

export type AIJobAnalysisResult = Pick<
  JobAnalysisDraft,
  | "fitScore"
  | "recommendation"
  | "positioningAngle"
  | "scoreFactors"
  | "skills"
  | "seniority"
  | "summary"
  | "gaps"
>

export type ServerAIResult<T> = {
  value: T
  model: string
  promptTokens: number
  completionTokens: number
  costUsd: number
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RateLimitError"
  }
}

const model = "gpt-4.1-mini"
const maxOutputTokens = 1200
const modelPricesPerMillionTokens: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 }
}
const rateLimitWindowMs = 60_000
const rateLimitMaxRequests = 20
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

const applicationContentSchema = z.object({
  coverLetter: z.string().optional(),
  profileSummary: z.string().optional(),
  motivationAnswer: z.string().optional(),
  strengthsAnswer: z.string().optional(),
  availabilityAnswer: z.string().optional()
})

const aiJobAnalysisSchema = z.object({
  fitScore: z.number().optional(),
  recommendation: z
    .enum(["High Priority", "Worth Applying", "Stretch", "Skip"])
    .optional(),
  positioningAngle: z.string().optional(),
  scoreFactors: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  seniority: z.string().optional(),
  summary: z.string().optional(),
  gaps: z.array(z.string()).optional()
})

const interviewPrepPackPartialSchema = z.object({
  roleSummary: z.string().optional(),
  positioningStatement: z.string().optional(),
  fitAndGapRecap: z.string().optional(),
  likelyQuestions: z.array(z.string()).optional(),
  starAnswerPrompts: z.array(z.string()).optional(),
  projectTalkingPoints: z.array(z.string()).optional(),
  skillsToRevise: z.array(z.string()).optional(),
  questionsToAskEmployer: z.array(z.string()).optional(),
  finalPrepChecklist: z.array(z.string()).optional()
})

let openAIClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (openAIClient) {
    return openAIClient
  }

  openAIClient = new OpenAI({
    apiKey: getServerEnv().OPENAI_API_KEY
  })

  return openAIClient
}

export function assertAiRouteRateLimit(rateLimitKey: string): void {
  const now = Date.now()
  const currentBucket = rateLimitBuckets.get(rateLimitKey)

  if (!currentBucket || currentBucket.resetAt <= now) {
    rateLimitBuckets.set(rateLimitKey, {
      count: 1,
      resetAt: now + rateLimitWindowMs
    })
    return
  }

  if (currentBucket.count >= rateLimitMaxRequests) {
    throw new RateLimitError("Too many AI requests. Please try again shortly.")
  }

  rateLimitBuckets.set(rateLimitKey, {
    ...currentBucket,
    count: currentBucket.count + 1
  })
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const json = trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed
  return JSON.parse(json)
}

function toStringValue(value: string | undefined) {
  return value ?? ""
}

function toStringArray(value: string[] | undefined) {
  return value ?? []
}

function normaliseApplicationContent(
  value: z.infer<typeof applicationContentSchema>
): ApplicationContentDraft {
  return {
    coverLetter: toStringValue(value.coverLetter),
    profileSummary: toStringValue(value.profileSummary),
    motivationAnswer: toStringValue(value.motivationAnswer),
    strengthsAnswer: toStringValue(value.strengthsAnswer),
    availabilityAnswer: toStringValue(value.availabilityAnswer)
  }
}

function normaliseJobAnalysis(
  value: z.infer<typeof aiJobAnalysisSchema>
): AIJobAnalysisResult {
  const fitScore =
    typeof value.fitScore === "number"
      ? Math.max(0, Math.min(100, value.fitScore))
      : 50

  return {
    fitScore,
    recommendation: value.recommendation ?? "Stretch",
    positioningAngle: toStringValue(value.positioningAngle),
    scoreFactors: toStringArray(value.scoreFactors),
    skills: toStringArray(value.skills),
    seniority: toStringValue(value.seniority),
    summary: toStringValue(value.summary),
    gaps: toStringArray(value.gaps)
  }
}

function normaliseInterviewPrepPack({
  fallback,
  value
}: {
  fallback: InterviewPrepPack
  value: z.infer<typeof interviewPrepPackPartialSchema>
}): InterviewPrepPack {
  const now = new Date().toISOString()

  return {
    id: fallback.id,
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

function estimateCostUsd({
  completionTokens,
  promptTokens
}: {
  completionTokens: number
  promptTokens: number
}): number {
  const prices = modelPricesPerMillionTokens[model]
  const estimatedCost =
    (promptTokens / 1_000_000) * prices.input +
    (completionTokens / 1_000_000) * prices.output

  return Number(estimatedCost.toFixed(6))
}

async function createJsonResponse<T>({
  input,
  instructions,
  schema
}: {
  input: unknown
  instructions: string
  schema: z.ZodType<T>
}): Promise<ServerAIResult<T>> {
  try {
    const response = await getOpenAIClient().responses.create({
      model,
      instructions,
      input: JSON.stringify(input),
      max_output_tokens: maxOutputTokens
    })
    const promptTokens = response.usage?.input_tokens ?? 0
    const completionTokens = response.usage?.output_tokens ?? 0
    const parsed = schema.parse(parseJsonObject(response.output_text))

    return {
      value: parsed,
      model,
      promptTokens,
      completionTokens,
      costUsd: estimateCostUsd({ promptTokens, completionTokens })
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "OpenAI request failed"

    throw new Error(message)
  }
}

export async function analyseJobWithOpenAI({
  jobAnalysis,
  profile
}: {
  jobAnalysis: JobAnalysisDraft
  profile: CandidateProfile | null
}): Promise<ServerAIResult<AIJobAnalysisResult>> {
  const result = await createJsonResponse({
    instructions: [
      "You analyse UK/EU job fit for a tech candidate.",
      "Return only valid JSON with fitScore number 0-100, recommendation one of High Priority, Worth Applying, Stretch, Skip, positioningAngle string, scoreFactors string array, skills string array, seniority string, summary string, gaps string array.",
      "Be conservative. Do not infer facts not present in the profile or job text."
    ].join(" "),
    input: { draft: jobAnalysis, profile },
    schema: aiJobAnalysisSchema
  })

  return {
    ...result,
    value: normaliseJobAnalysis(result.value)
  }
}

export async function generateContentWithOpenAI({
  job,
  profile,
  reusableAnswers
}: {
  job: JobAnalysisDraft
  profile: CandidateProfile
  reusableAnswers: ReusableAnswers | null
}): Promise<ServerAIResult<ApplicationContentDraft>> {
  const result = await createJsonResponse({
    instructions: [
      "You write concise, truthful UK/EU job application content.",
      "Return only valid JSON with keys coverLetter, profileSummary, motivationAnswer, strengthsAnswer, availabilityAnswer.",
      "Do not invent employers, credentials, degrees, work rights, salary, or relocation facts.",
      "Use the candidate profile and job analysis. Keep outputs editable and specific."
    ].join(" "),
    input: { profile, job, reusableAnswers },
    schema: applicationContentSchema
  })

  return {
    ...result,
    value: normaliseApplicationContent(result.value)
  }
}

export async function generateInterviewPrepWithOpenAI({
  application,
  job,
  profile,
  reusableAnswers
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  profile: CandidateProfile
  reusableAnswers: ReusableAnswers
}): Promise<ServerAIResult<InterviewPrepPack>> {
  const fallbackPack = createLocalInterviewPrepPack(application, profile, job)
  const result = await createJsonResponse({
    instructions: [
      "You create truthful UK/EU job interview preparation packs.",
      "Return only valid JSON with keys roleSummary, positioningStatement, fitAndGapRecap, likelyQuestions, starAnswerPrompts, projectTalkingPoints, skillsToRevise, questionsToAskEmployer, finalPrepChecklist.",
      "All list keys must be string arrays.",
      "Use only the supplied candidate profile, reusable answers, job analysis and application record.",
      "Do not invent experience, employers, degrees, certifications, work rights, salary, relocation facts, or outcomes."
    ].join(" "),
    input: { profile, reusableAnswers, job, application },
    schema: interviewPrepPackPartialSchema
  })

  return {
    ...result,
    value: normaliseInterviewPrepPack({
      fallback: fallbackPack,
      value: result.value
    })
  }
}
