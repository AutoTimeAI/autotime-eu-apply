/** Generates technical interview drills grounded in candidate and job evidence. */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { candidateProfileSchema, jobAnalysisDraftSchema } from "shared"
import {
  assertAiRouteRateLimit,
  generateTechnicalInterviewDrillsWithOpenAI,
  RateLimitError,
  type TechnicalInterviewDrill,
} from "../../../../lib/openai-server"
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

type TechnicalInterviewRouteData =
  | { drills: TechnicalInterviewDrill[] }
  | { upgradeUrl: string }

const requestSchema = z.object({
  difficulty: z.enum(["standard", "advanced", "senior"]),
  focus: z.enum(["systems", "debugging", "api", "data", "delivery"]),
  job: jobAnalysisDraftSchema,
  profile: candidateProfileSchema,
})

function jsonResponse(
  body: ApiResponse<TechnicalInterviewRouteData>,
): NextResponse<ApiResponse<TechnicalInterviewRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<TechnicalInterviewRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "ai",
        code: "ai.technical-interview.auth.missing-user",
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
      result = await generateTechnicalInterviewDrillsWithOpenAI(body)
    } catch (error: unknown) {
      await releaseAiCall(reservationId)
      throw error
    }

    await finalizeAiCall(reservationId, {
      feature: "technical-interview-drills",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    })

    return jsonResponse({
      data: { drills: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "ai",
        code: "ai.technical-interview.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.technical-interview.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402,
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.technical-interview.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429,
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.technical-interview.request.invalid",
        data: null,
        error: getValidationIssueMessage({
          fallback:
            "Technical interview drills need valid focus, difficulty, job and profile inputs.",
          issues: error.issues,
          prefix: "Technical interview drills need valid input for",
        }),
        request,
        status: 400,
      })
    }

    const message =
      error instanceof Error
        ? error.message
        : "AI technical interview drills failed"

    return diagnosticJson({
      area: "ai",
      code: "ai.technical-interview.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
