import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  candidateProfileSchema,
  jobAnalysisDraftSchema
} from "shared"
import {
  assertAiRouteRateLimit,
  analyseJobWithOpenAI,
  RateLimitError,
  type AIJobAnalysisResult
} from "../../../../lib/openai-server"
import {
  assertCanUseAi,
  FeatureGateError,
  trackAiCall
} from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type AnalyseRouteData =
  | { result: AIJobAnalysisResult }
  | { upgradeUrl: string }

const requestSchema = z.object({
  jobAnalysis: jobAnalysisDraftSchema,
  profile: candidateProfileSchema.nullable()
})

function jsonResponse(
  body: ApiResponse<AnalyseRouteData>
): NextResponse<ApiResponse<AnalyseRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AnalyseRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return jsonResponse({ data: null, error: "Unauthorised", status: 401 })
    }

    assertAiRouteRateLimit(user.id)
    await assertCanUseAi(user.id)

    const body = requestSchema.parse(await request.json())
    const result = await analyseJobWithOpenAI(body)

    await trackAiCall(user.id, {
      feature: "job-analysis",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd
    })

    return jsonResponse({
      data: { result: result.value },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof FeatureGateError) {
      return jsonResponse({
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        status: 402
      })
    }

    if (error instanceof RateLimitError) {
      return jsonResponse({ data: null, error: error.message, status: 429 })
    }

    if (error instanceof z.ZodError) {
      return jsonResponse({ data: null, error: "Invalid request body", status: 400 })
    }

    const message =
      error instanceof Error ? error.message : "AI analysis failed"

    return jsonResponse({ data: null, error: message, status: 500 })
  }
}
