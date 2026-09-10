/** Generates evidence-constrained application content for an authenticated user. */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  candidateProfileSchema,
  jobAnalysisDraftSchema,
  reusableAnswersSchema,
  type ApplicationContentDraft,
} from "shared"
import {
  assertAiRouteRateLimit,
  generateContentWithOpenAI,
  RateLimitError,
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
import { trackApplicationKitGenerated } from "../../../../lib/sentry-breadcrumbs"
import {
  ApplicationPreparationBlockedError,
  prepareApplicationKit,
} from "../../../../domains/application-preparation/prepare-application-kit"
import { assessApplicationDecision } from "../../../../platform/application-preparation/decision-adapter"

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
  reusableAnswers: reusableAnswersSchema.nullable(),
  context: z
    .object({
      candidatePosition: z.enum(["foreign-candidate", "native-candidate"]),
      targetCountry: z.string().trim().min(1),
    })
    .optional(),
})

function jsonResponse(
  body: ApiResponse<ContentRouteData>,
): NextResponse<ApiResponse<ContentRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getUpgradeUrl(request: NextRequest): string {
  return new URL("/pricing", request.url).toString()
}

export async function POST(
  request: NextRequest,
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
        status: 401,
      })
    }

    const body = requestSchema.parse(await request.json())

    const result = await prepareApplicationKit({
      input: body,
      userId: user.id,
      ports: {
        decisions: { assess: assessApplicationDecision },
        generator: { generate: generateContentWithOpenAI },
        lifecycle: {
          generationStarted: () =>
            trackApplicationKitGenerated({
              route: "/api/ai/content",
              status: "started",
            }),
        },
        usage: {
          assertAllowed: assertAiRouteRateLimit,
          reserve: reserveAiCall,
          release: releaseAiCall,
          finalize: (reservationId, usage) =>
            finalizeAiCall(reservationId, {
              feature: "application-content",
              ...usage,
            }),
        },
      },
    })

    return jsonResponse({
      data: { content: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (error instanceof ApplicationPreparationBlockedError)
      return diagnosticJson({
        area: "ai",
        code: "ai.content.guardrail.blocked",
        data: null,
        error: error.message,
        request,
        status: 422,
      })
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "ai",
        code: "ai.content.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof FeatureGateError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.feature-gate",
        data: { upgradeUrl: getUpgradeUrl(request) },
        error: error.message,
        request,
        status: 402,
      })
    }

    if (error instanceof RateLimitError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.rate-limit",
        data: null,
        error: error.message,
        request,
        status: 429,
      })
    }

    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.request.invalid",
        data: null,
        error: getValidationIssueMessage({
          fallback:
            "Content generation needs a valid profile, job record and reusable answers.",
          issues: error.issues,
          prefix: "Content generation needs valid input for",
        }),
        request,
        status: 400,
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
      status: 500,
    })
  }
}
