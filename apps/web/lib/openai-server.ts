import OpenAI from "openai"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"
import { getServerEnv } from "./env"
import {
  assertInterviewPrepReady,
  createLocalInterviewPrepPack
} from "./interview-prep"
import { createAdminClient } from "./supabase/admin"
import { AUTOTIME_FIT_SCORE_DISCLAIMER } from "shared"
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
  | "fitLabel"
  | "confidenceLevel"
  | "scoreBreakdown"
  | "matchedSignals"
  | "missingSignals"
  | "riskAreas"
  | "suggestedCvPositioning"
  | "suggestedNextAction"
  | "shortSummary"
  | "disclaimer"
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

export type InterviewAnswerCoachResult = {
  evidenceScore: number
  riskFlags: string[]
  missingEvidence: string[]
  professionalAnswer: string
  naturalAnswer: string
  lightFunnyAnswer: string
  strongFinalAnswer: string
  followUpDrills: string[]
  boundaryNote: string
}

export type TechnicalInterviewDifficulty = "standard" | "advanced" | "senior"
export type TechnicalInterviewFocus =
  | "systems"
  | "debugging"
  | "api"
  | "data"
  | "delivery"

export type TechnicalInterviewDrill = {
  answerContract: string[]
  evidenceHook: string
  euContext: string[]
  question: string
  riskChecks: string[]
  timebox: string
  expectedSignals: string[]
  followUps: string[]
  prepHint: string
}

export type ProfileContextAIResult = {
  roleMarket:
    | "general-tech"
    | "fintech"
    | "enterprise-saas"
    | "data-ai"
    | "cybersecurity"
    | "healthtech"
    | "climate-energy"
    | "gov-public"
    | "ecommerce-marketplace"
    | "devtools-cloud"
  candidatePosition: "foreign-candidate" | "native-candidate"
  urgency: "urgent" | "active" | "exploring"
  targetCountry: string
  experienceLevel: string
  targetRoles: string
  workRightPrompt: string
  confidence: "Low" | "Medium" | "High"
  reasons: string[]
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
const rateLimitWindowSeconds = rateLimitWindowMs / 1000
const rateLimitMaxRequests = 20

const stringListSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => normaliseStringList(value))

const applicationContentSchema = z.object({
  coverLetter: z.string().optional(),
  profileSummary: z.string().optional(),
  motivationAnswer: z.string().optional(),
  strengthsAnswer: z.string().optional(),
  availabilityAnswer: z.string().optional()
})

const autoTimeScoreBreakdownItemSchema = z.object({
  key: z.string().optional(),
  label: z.string().optional(),
  maxPoints: z.number().optional(),
  points: z.number().optional(),
  rationale: z.string().optional()
})

const aiJobAnalysisSchema = z.object({
  fitScore: z.number().optional(),
  fitLabel: z
    .enum(["Strong fit", "Good fit", "Stretch fit", "Low fit"])
    .optional(),
  confidenceLevel: z.enum(["Low", "Medium", "High"]).optional(),
  scoreBreakdown: z.array(autoTimeScoreBreakdownItemSchema).optional(),
  matchedSignals: stringListSchema,
  missingSignals: stringListSchema,
  riskAreas: stringListSchema,
  suggestedCvPositioning: z.string().optional(),
  suggestedNextAction: z.string().optional(),
  shortSummary: z.string().optional(),
  disclaimer: z.string().optional(),
  recommendation: z
    .enum(["High Priority", "Worth Applying", "Stretch", "Skip"])
    .optional(),
  positioningAngle: z.string().optional(),
  scoreFactors: stringListSchema,
  skills: stringListSchema,
  seniority: z.string().optional(),
  summary: z.string().optional(),
  gaps: stringListSchema
})

const interviewPrepPackPartialSchema = z.object({
  roleSummary: z.string().optional(),
  positioningStatement: z.string().optional(),
  fitAndGapRecap: z.string().optional(),
  likelyQuestions: stringListSchema,
  starAnswerPrompts: stringListSchema,
  projectTalkingPoints: stringListSchema,
  skillsToRevise: stringListSchema,
  questionsToAskEmployer: stringListSchema,
  finalPrepChecklist: stringListSchema
})

const interviewAnswerCoachSchema = z.object({
  evidenceScore: z.number().optional(),
  riskFlags: stringListSchema,
  missingEvidence: stringListSchema,
  professionalAnswer: z.string().optional(),
  naturalAnswer: z.string().optional(),
  lightFunnyAnswer: z.string().optional(),
  strongFinalAnswer: z.string().optional(),
  followUpDrills: stringListSchema,
  boundaryNote: z.string().optional()
})

const technicalInterviewDrillSchema = z.object({
  answerContract: stringListSchema,
  evidenceHook: z.string().optional(),
  euContext: stringListSchema,
  question: z.string().optional(),
  riskChecks: stringListSchema,
  timebox: z.string().optional(),
  expectedSignals: stringListSchema,
  followUps: stringListSchema,
  prepHint: z.string().optional()
})

const technicalInterviewDrillsSchema = z.object({
  drills: z.array(technicalInterviewDrillSchema).optional()
})

const profileContextSchema = z.object({
  roleMarket: z
    .enum([
      "general-tech",
      "fintech",
      "enterprise-saas",
      "data-ai",
      "cybersecurity",
      "healthtech",
      "climate-energy",
      "gov-public",
      "ecommerce-marketplace",
      "devtools-cloud"
    ])
    .optional(),
  candidatePosition: z
    .enum(["foreign-candidate", "native-candidate"])
    .optional(),
  urgency: z.enum(["urgent", "active", "exploring"]).optional(),
  targetCountry: z.string().optional(),
  experienceLevel: z.string().optional(),
  targetRoles: stringListSchema,
  workRightPrompt: z.string().optional(),
  confidence: z.enum(["Low", "Medium", "High"]).optional(),
  reasons: stringListSchema
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

export async function assertAiRouteRateLimit(
  rateLimitKey: string
): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("increment_ai_rate_limit", {
    p_rate_limit_key: rateLimitKey,
    p_window_seconds: rateLimitWindowSeconds,
    p_max_requests: rateLimitMaxRequests
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new RateLimitError("Too many AI requests. Please try again shortly.")
  }
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

function normaliseStringList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean)
  }

  if (typeof value !== "string") {
    return []
  }

  const delimiter = /[\n;]/.test(value) ? /[\n;]/ : ","

  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
}

function renderTargetRoles(value: string[]): string {
  return value.join(", ")
}

function getFitLabel(score: number): AIJobAnalysisResult["fitLabel"] {
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

function normaliseScoreBreakdown(
  value: z.infer<typeof autoTimeScoreBreakdownItemSchema>[] | undefined
): NonNullable<AIJobAnalysisResult["scoreBreakdown"]> {
  return (value ?? [])
    .map((item) => ({
      key: toStringValue(item.key),
      label: toStringValue(item.label),
      maxPoints:
        typeof item.maxPoints === "number" ? Math.max(0, item.maxPoints) : 0,
      points: typeof item.points === "number" ? Math.max(0, item.points) : 0,
      rationale: toStringValue(item.rationale)
    }))
    .filter((item) => item.label && item.maxPoints > 0)
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
    fitLabel: value.fitLabel ?? getFitLabel(fitScore),
    confidenceLevel: value.confidenceLevel ?? "Medium",
    scoreBreakdown: normaliseScoreBreakdown(value.scoreBreakdown),
    matchedSignals: toStringArray(value.matchedSignals),
    missingSignals: toStringArray(value.missingSignals),
    riskAreas: toStringArray(value.riskAreas),
    suggestedCvPositioning: toStringValue(value.suggestedCvPositioning),
    suggestedNextAction: toStringValue(value.suggestedNextAction),
    shortSummary: toStringValue(value.shortSummary),
    disclaimer: value.disclaimer?.trim() || AUTOTIME_FIT_SCORE_DISCLAIMER,
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

function normaliseInterviewAnswerCoach(
  value: z.infer<typeof interviewAnswerCoachSchema>
): InterviewAnswerCoachResult {
  const evidenceScore =
    typeof value.evidenceScore === "number"
      ? Math.max(0, Math.min(100, Math.round(value.evidenceScore)))
      : 50

  return {
    evidenceScore,
    riskFlags: toStringArray(value.riskFlags),
    missingEvidence: toStringArray(value.missingEvidence),
    professionalAnswer: toStringValue(value.professionalAnswer),
    naturalAnswer: toStringValue(value.naturalAnswer),
    lightFunnyAnswer: toStringValue(value.lightFunnyAnswer),
    strongFinalAnswer: toStringValue(value.strongFinalAnswer),
    followUpDrills: toStringArray(value.followUpDrills),
    boundaryNote:
      toStringValue(value.boundaryNote) ||
      "Use this as interview preparation only. Keep every claim truthful and verifiable."
  }
}

function normaliseTechnicalInterviewDrills(
  value: z.infer<typeof technicalInterviewDrillsSchema>
): TechnicalInterviewDrill[] {
  return (value.drills ?? [])
    .map((drill) => ({
      answerContract: toStringArray(drill.answerContract).length
        ? toStringArray(drill.answerContract)
        : [
            "Anchor the answer in saved evidence.",
            "Name the trade-off.",
            "State what you would verify before making stronger claims."
          ],
      evidenceHook:
        toStringValue(drill.evidenceHook) ||
        "Use saved profile and job evidence; add missing proof before making strong claims.",
      euContext: toStringArray(drill.euContext).length
        ? toStringArray(drill.euContext)
        : [
            "Frame the answer for UK/EU teams: privacy, security, documentation, rollout control and work-right accuracy where relevant."
          ],
      question: toStringValue(drill.question),
      riskChecks: toStringArray(drill.riskChecks).length
        ? toStringArray(drill.riskChecks)
        : [
            "Do not invent scale, tools, employers or outcomes.",
            "Separate known evidence from assumptions."
          ],
      timebox: toStringValue(drill.timebox) || "4 minutes",
      expectedSignals: toStringArray(drill.expectedSignals),
      followUps: toStringArray(drill.followUps),
      prepHint:
        toStringValue(drill.prepHint) ||
        "Answer with saved evidence, clear trade-offs and explicit limits."
    }))
    .filter((drill) => drill.question && drill.followUps.length > 0)
    .slice(0, 4)
}

function normaliseProfileContext({
  currentContext,
  value
}: {
  currentContext: Pick<
    ProfileContextAIResult,
    | "candidatePosition"
    | "experienceLevel"
    | "roleMarket"
    | "targetCountry"
    | "urgency"
  >
  value: z.infer<typeof profileContextSchema>
}): ProfileContextAIResult {
  const candidatePosition =
    value.candidatePosition ?? currentContext.candidatePosition

  return {
    roleMarket: value.roleMarket ?? currentContext.roleMarket,
    candidatePosition,
    urgency: value.urgency ?? currentContext.urgency,
    targetCountry:
      toStringValue(value.targetCountry) || currentContext.targetCountry,
    experienceLevel:
      toStringValue(value.experienceLevel) || currentContext.experienceLevel,
    targetRoles: renderTargetRoles(value.targetRoles),
    workRightPrompt:
      toStringValue(value.workRightPrompt) ||
      (candidatePosition === "foreign-candidate"
        ? "Confirm visa/work-right status, sponsorship need, relocation timing and eligible countries before applying."
        : "Confirm local work-right status, notice period, salary expectations and availability before applying."),
    confidence: value.confidence ?? "Medium",
    reasons: toStringArray(value.reasons)
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
    return await Sentry.startSpan(
      {
        attributes: {
          "ai.model": model,
          "ai.provider": "openai",
          "ai.request.max_output_tokens": maxOutputTokens
        },
        name: "OpenAI Responses JSON generation",
        op: "ai.generate"
      },
      async (span) => {
        const response = await getOpenAIClient().responses.create({
          model,
          instructions,
          input: JSON.stringify(input),
          max_output_tokens: maxOutputTokens
        })
        const promptTokens = response.usage?.input_tokens ?? 0
        const completionTokens = response.usage?.output_tokens ?? 0
        const costUsd = estimateCostUsd({ promptTokens, completionTokens })
        const parsed = schema.parse(parseJsonObject(response.output_text))

        span.setAttribute("ai.usage.input_tokens", promptTokens)
        span.setAttribute("ai.usage.output_tokens", completionTokens)
        span.setAttribute("ai.usage.cost_usd", costUsd)

        return {
          value: parsed,
          model,
          promptTokens,
          completionTokens,
          costUsd
        }
      }
    )
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
      "Use the AutoTime Fit Score out of 100: role/title alignment 20, required skills match 25, experience/seniority match 15, domain/industry relevance 10, location/work setup match 10, CV evidence strength 10, application readiness 10.",
      "Apply conservative penalties for missing required skill, location or work-authorisation mismatch, seniority mismatch, and weak CV evidence.",
      "Return only valid JSON with fitScore number 0-100, fitLabel one of Strong fit, Good fit, Stretch fit, Low fit, confidenceLevel Low/Medium/High, scoreBreakdown array, matchedSignals string array, missingSignals string array, riskAreas string array, suggestedCvPositioning string, suggestedNextAction string, shortSummary string, disclaimer string, recommendation one of High Priority, Worth Applying, Stretch, Skip, positioningAngle string, scoreFactors string array, skills string array, seniority string, summary string, gaps string array.",
      "List fields can be string arrays or readable newline/comma-separated strings.",
      `The disclaimer must be exactly: ${AUTOTIME_FIT_SCORE_DISCLAIMER}`,
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
      "Every claim must be supported by the candidate profile, reusable answers, or job text.",
      "If evidence is thin, write conservatively and avoid strong claims.",
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
  assertInterviewPrepReady({ application, job, profile })

  const fallbackPack = createLocalInterviewPrepPack(application, profile, job)
  const result = await createJsonResponse({
    instructions: [
      "You create truthful UK/EU job interview preparation packs.",
      "Return only valid JSON with keys roleSummary, positioningStatement, fitAndGapRecap, likelyQuestions, starAnswerPrompts, projectTalkingPoints, skillsToRevise, questionsToAskEmployer, finalPrepChecklist.",
      "All list keys must be string arrays.",
      "If a list is returned as a readable string, AutoTime will normalise it, but arrays are preferred.",
      "Use only the supplied candidate profile, reusable answers, job analysis and application record.",
      "Do not invent experience, employers, degrees, certifications, work rights, salary, relocation facts, or outcomes.",
      "If a claim has no supplied evidence, state that evidence is missing instead of writing the claim.",
      "STAR prompts must ask the user to supply truthful examples; do not fabricate complete stories.",
      "No immigration or legal advice. For work-right questions, keep it general and tell the user to check official sources or a qualified adviser."
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

export async function generateInterviewAnswerWithOpenAI({
  draft,
  job,
  profile,
  question,
  reusableAnswers
}: {
  draft: string
  job: JobAnalysisDraft
  profile: CandidateProfile
  question: string
  reusableAnswers: ReusableAnswers
}): Promise<ServerAIResult<InterviewAnswerCoachResult>> {
  const result = await createJsonResponse({
    instructions: [
      "You are AutoTime Interview Coach for UK/EU cross-border job candidates.",
      "Return only valid JSON with keys evidenceScore, riskFlags, missingEvidence, professionalAnswer, naturalAnswer, lightFunnyAnswer, strongFinalAnswer, followUpDrills, boundaryNote.",
      "All list keys must be string arrays. evidenceScore is 0-100.",
      "If a list is returned as a readable string, AutoTime will normalise it, but arrays are preferred.",
      "Follow AutoTime's motto: evidence first, transparent limits, user control, no hidden claims.",
      "Use only the user's rough draft, saved profile, reusable answers and job text.",
      "Do not invent achievements, employers, qualifications, salary, work rights, sponsorship status, relocation facts or outcomes.",
      "If evidence is missing, say what is missing instead of filling the gap.",
      "For visa, sponsorship, work-right or immigration questions, give career-prep wording only and include a boundary note to verify official sources or qualified advice.",
      "Make the answers specific, mature and interview-ready, but still sound like the candidate."
    ].join(" "),
    input: { draft, job, profile, question, reusableAnswers },
    schema: interviewAnswerCoachSchema
  })

  return {
    ...result,
    value: normaliseInterviewAnswerCoach(result.value)
  }
}

export async function generateTechnicalInterviewDrillsWithOpenAI({
  difficulty,
  focus,
  job,
  profile
}: {
  difficulty: TechnicalInterviewDifficulty
  focus: TechnicalInterviewFocus
  job: JobAnalysisDraft
  profile: CandidateProfile
}): Promise<ServerAIResult<TechnicalInterviewDrill[]>> {
  const result = await createJsonResponse({
    instructions: [
      "You create realistic technical interview drills for UK/EU tech roles.",
      "Return only valid JSON with key drills. drills must be an array of objects with keys question, timebox, evidenceHook, euContext, answerContract, expectedSignals, riskChecks, followUps, prepHint.",
      "Create 2 to 4 drills. euContext, answerContract, expectedSignals, riskChecks and followUps must be string arrays.",
      "The drills should feel like live technical interview questions: architecture, debugging, API/data trade-offs, reliability, security, delivery decisions, and follow-up pressure.",
      "This is an AutoTime product surface, not a generic question generator. Every drill must include a proof layer: evidenceHook explains which supplied job/profile signal the user should anchor on, answerContract states what the answer must prove, and riskChecks state what not to overclaim.",
      "Make the drills EU-centric: include privacy-by-design, GDPR-safe logging/data handling, documentation, stakeholder clarity, measured rollout, auditability, cross-border teams, or work-right boundaries when relevant to the supplied job/profile.",
      "Use only the supplied job and candidate profile. Do not invent employers, certifications, exact tools, production incidents or achievements.",
      "If evidence is thin, make the question evidence-seeking and tell the user what proof to prepare.",
      "Questions must be challenging but answerable verbally without coding tools.",
      "No immigration, legal or hiring advice."
    ].join(" "),
    input: { difficulty, focus, job, profile },
    schema: technicalInterviewDrillsSchema
  })

  return {
    ...result,
    value: normaliseTechnicalInterviewDrills(result.value)
  }
}

export async function reviewProfileContextWithOpenAI({
  currentContext,
  resumeText
}: {
  currentContext: Pick<
    ProfileContextAIResult,
    | "candidatePosition"
    | "experienceLevel"
    | "roleMarket"
    | "targetCountry"
    | "urgency"
  >
  resumeText: string
}): Promise<ServerAIResult<ProfileContextAIResult>> {
  const result = await createJsonResponse({
    instructions: [
      "You review CV text for AutoTime's profile setup step.",
      "Return only valid JSON with keys roleMarket, candidatePosition, urgency, targetCountry, experienceLevel, targetRoles, workRightPrompt, confidence, reasons.",
      "roleMarket must be one of general-tech, fintech, enterprise-saas, data-ai, cybersecurity, healthtech, climate-energy, gov-public, ecommerce-marketplace, devtools-cloud.",
      "candidatePosition must be foreign-candidate or native-candidate. urgency must be urgent, active, or exploring. confidence must be Low, Medium, or High.",
      "targetRoles can be a comma-separated string or an array of role strings. Keep roles readable and concise.",
      "Suggest target roles and profile context only from CV evidence and the current context.",
      "Do not invent work rights, visa status, sponsorship status, relocation facts, degrees, employers, dates, salary, or outcomes.",
      "For workRightPrompt, ask the user to confirm exact verified facts. Do not state that they have work rights unless the CV explicitly says it.",
      "Keep reasons short and explain which CV signals drove the suggestion."
    ].join(" "),
    input: { currentContext, resumeText },
    schema: profileContextSchema
  })

  return {
    ...result,
    value: normaliseProfileContext({
      currentContext,
      value: result.value
    })
  }
}
