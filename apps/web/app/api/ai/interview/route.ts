import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  applicationRecordSchema,
  candidateProfileSchema,
  jobAnalysisDraftSchema,
  reusableAnswersSchema,
  type InterviewPrepPack,
} from "shared"
import {
  assertAiRouteRateLimit,
  generateInterviewPrepWithOpenAI,
  RateLimitError,
} from "../../../../lib/openai-server"
import { InterviewPrepGuardrailError } from "../../../../lib/interview-prep"
import {
  reserveAiCall,
  releaseAiCall,
  FeatureGateError,
  finalizeAiCall,
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

type InterviewRouteData = { pack: InterviewPrepPack } | { upgradeUrl: string }

const requestSchema = z.object({
  application: applicationRecordSchema,
  profile: candidateProfileSchema,
  reusableAnswers: reusableAnswersSchema,
  job: jobAnalysisDraftSchema,
})

function jsonResponse(
  body: ApiResponse<InterviewRouteData>,
): NextResponse<ApiResponse<InterviewRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<InterviewRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const body = requestSchema.parse(await request.json())

    await assertAiRouteRateLimit(user.id)
    const reservationId = await reserveAiCall(user.id)

    let result
    try {
      result = await generateInterviewPrepWithOpenAI(body)
    } catch (error: unknown) {
      await releaseAiCall(reservationId)
      throw error
    }

    await finalizeAiCall(reservationId, {
      feature: "interview-prep",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    })

    return jsonResponse({
      data: { pack: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402,
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429,
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.request.invalid",
        data: null,
        error: getValidationIssueMessage({
          fallback:
            "Interview prep needs a valid application, profile, job record and reusable answers.",
          issues: error.issues,
          prefix: "Interview prep needs valid input for",
        }),
        request,
        status: 400,
      })
    }

    if (error instanceof InterviewPrepGuardrailError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.interview.guardrails.blocked",
        data: null,
        error: error.message,
        request,
        status: 422,
      })
    }

    const message =
      error instanceof Error ? error.message : "AI interview prep failed"

    return diagnosticJson({
      area: "ai",
      code: "ai.interview.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
