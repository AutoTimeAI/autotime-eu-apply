import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  candidateProfileSchema,
  evaluateCountryFit,
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
import {
  diagnosticJson,
  getValidationIssueMessage
} from "../../../../lib/diagnostics"
import { trackApplicationKitGenerated } from "../../../../lib/sentry-breadcrumbs"

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
      targetCountry: z.string().trim().min(1)
    })
    .optional()
})

function getFirstTargetCountry(
  profileTargetCountries: string,
  jobLocation: string
) {
  return (
    profileTargetCountries
      .split(",")
      .map((item) => item.trim())
      .find(Boolean) ||
    jobLocation.trim() ||
    "European Union"
  )
}

function getContentGuardrailIssues(body: z.infer<typeof requestSchema>) {
  const missing = [
    !body.profile.baseCvText.trim() && "CV text",
    !body.profile.targetRoles.trim() && "target roles",
    !body.profile.workRightDetails.trim() && "work-right details",
    !body.job.jobDescription.trim() && "job description"
  ].filter(Boolean) as string[]
  const evaluation = evaluateCountryFit({
    profile: body.profile,
    job: body.job,
    context: {
      candidatePosition:
        body.context?.candidatePosition ??
        (body.profile.sponsorshipNeeded
          ? "foreign-candidate"
          : "native-candidate"),
      targetCountry:
        body.context?.targetCountry ??
        getFirstTargetCountry(body.profile.targetCountries, body.job.location)
    }
  })

  return [
    ...missing.map((item) => `Missing required evidence: ${item}.`),
    ...evaluation.blockers,
    evaluation.contentGate === "blocked" &&
      "Content generation is blocked by the country/work-right decision gate."
  ].filter(Boolean) as string[]
}

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

    const body = requestSchema.parse(await request.json())

    await assertAiRouteRateLimit(user.id)
    await assertCanUseAi(user.id)

    const guardrailIssues = getContentGuardrailIssues(body)

    if (guardrailIssues.length > 0) {
      return diagnosticJson({
        area: "ai",
        code: "ai.content.guardrail.blocked",
        data: null,
        error: `Content generation blocked: ${guardrailIssues.join(" ")}`,
        request,
        status: 422
      })
    }

    trackApplicationKitGenerated({
      route: "/api/ai/content",
      status: "started"
    })
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
        error: getValidationIssueMessage({
          fallback:
            "Content generation needs a valid profile, job record and reusable answers.",
          issues: error.issues,
          prefix: "Content generation needs valid input for"
        }),
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
