import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  candidateProfileSchema,
  jobAnalysisDraftSchema,
  reusableAnswersSchema,
} from "shared"
import {
  assertAiRouteRateLimit,
  generateInterviewAnswerWithOpenAI,
  RateLimitError,
  type InterviewAnswerCoachResult,
} from "../../../../lib/openai-server"
import {
  assertCanUseAi,
  FeatureGateError,
  trackAiCall,
} from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import {
  diagnosticJson,
  getValidationIssueMessage,
} from "../../../../lib/diagnostics"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type InterviewAnswerRouteData =
  | { coach: InterviewAnswerCoachResult }
  | { upgradeUrl: string }

const requestSchema = z.object({
  draft: z.string().trim().min(30),
  job: jobAnalysisDraftSchema,
  profile: candidateProfileSchema,
  question: z.string().trim().min(12),
  reusableAnswers: reusableAnswersSchema,
})

function jsonResponse(
  body: ApiResponse<InterviewAnswerRouteData>,
): NextResponse<ApiResponse<InterviewAnswerRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<InterviewAnswerRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview-answer.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const body = requestSchema.parse(await request.json())

    await assertAiRouteRateLimit(user.id)
    await assertCanUseAi(user.id)

    const result = await generateInterviewAnswerWithOpenAI(body)

    await trackAiCall(user.id, {
      feature: "interview-answer-coach",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    })

    return jsonResponse({
      data: { coach: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "ai",
        code: "ai.interview-answer.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview-answer.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402,
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview-answer.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429,
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview-answer.request.invalid",
        data: null,
        error: getValidationIssueMessage({
          fallback:
            "Interview answer coaching needs a valid draft, question, job record, profile and reusable answers.",
          issues: error.issues,
          prefix: "Interview answer coaching needs valid input for",
        }),
        request,
        status: 400,
      })
    }

    const message =
      error instanceof Error ? error.message : "AI interview answer failed"

    return diagnosticJson({
      area: "ai",
      code: "ai.interview-answer.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
