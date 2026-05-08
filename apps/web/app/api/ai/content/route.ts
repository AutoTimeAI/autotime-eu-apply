import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  candidateProfileSchema,
  jobAnalysisDraftSchema,
  reusableAnswersSchema,
  type ApplicationContentDraft
} from "shared"
import {
  assertAiRouteRateLimit,
  generateContentWithOpenAI,
  RateLimitError
} from "../../../../lib/openai-server"
import {
  assertCanUseAi,
  FeatureGateError,
  trackAiCall
} from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type ContentRouteData =
  | { content: ApplicationContentDraft }
  | { upgradeUrl: string }

const requestSchema = z.object({
  profile: candidateProfileSchema,
  job: jobAnalysisDraftSchema,
  reusableAnswers: reusableAnswersSchema.nullable()
})

function jsonResponse(
  body: ApiResponse<ContentRouteData>
): NextResponse<ApiResponse<ContentRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ContentRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    assertAiRouteRateLimit(user.id)
    await assertCanUseAi(user.id)

    const body = requestSchema.parse(await request.json())
    const result = await generateContentWithOpenAI(body)

    await trackAiCall(user.id, {
      feature: "application-content",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd
    })

    return jsonResponse({
      data: { content: result.value },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.request.invalid",
        data: null,
        error: "Invalid request body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "AI content generation failed"

    return diagnosticJson({
      area: "ai",
      code: "ai.content.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
