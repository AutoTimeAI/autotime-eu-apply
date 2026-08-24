/** Generates reusable profile context from bounded authenticated-user evidence. */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import {
  diagnosticJson,
  getValidationIssueMessage,
} from "../../../../lib/diagnostics"
import {
  assertCanUseAi,
  FeatureGateError,
  trackAiCall,
} from "../../../../lib/feature-gate"
import {
  assertAiRouteRateLimit,
  RateLimitError,
  reviewProfileContextWithOpenAI,
  type ProfileContextAIResult,
} from "../../../../lib/openai-server"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type ProfileContextRouteData =
  | { suggestion: ProfileContextAIResult }
  | { upgradeUrl: string }

const requestSchema = z.object({
  currentContext: z.object({
    roleMarket: z.enum([
      "general-tech",
      "fintech",
      "enterprise-saas",
      "data-ai",
      "cybersecurity",
      "healthtech",
      "climate-energy",
      "gov-public",
      "ecommerce-marketplace",
      "devtools-cloud",
    ]),
    candidatePosition: z.enum(["foreign-candidate", "native-candidate"]),
    urgency: z.enum(["urgent", "active", "exploring"]),
    targetCountry: z.string().trim().min(2),
    experienceLevel: z.string().trim().min(2),
  }),
  resumeText: z.string().trim().min(40),
})

function jsonResponse(
  body: ApiResponse<ProfileContextRouteData>,
): NextResponse<ApiResponse<ProfileContextRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProfileContextRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "ai",
        code: "ai.profile-context.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const body = requestSchema.parse(await request.json())

    await assertAiRouteRateLimit(user.id)
    await assertCanUseAi(user.id)

    const result = await reviewProfileContextWithOpenAI(body)

    await trackAiCall(user.id, {
      feature: "profile-context-review",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    })

    return jsonResponse({
      data: { suggestion: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "ai",
        code: "ai.profile-context.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.profile-context.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402,
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.profile-context.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429,
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.profile-context.request.invalid",
        data: null,
        error: getValidationIssueMessage({
          fallback:
            "CV review needs candidate context and at least 40 characters of CV text.",
          issues: error.issues,
          prefix: "CV review needs valid input for",
        }),
        request,
        status: 400,
      })
    }

    const message =
      error instanceof Error ? error.message : "AI CV review failed"

    return diagnosticJson({
      area: "ai",
      code: "ai.profile-context.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
