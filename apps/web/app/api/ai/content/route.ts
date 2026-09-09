/** Generates evidence-constrained application content for an authenticated user. */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  assessInternationalJob,
  candidateProfileSchema,
  evaluateAutoTimeFitScore,
  fetchStamp4SponsorshipAssessment,
  getInternationalCountryPack,
  isStamp4SponsorshipCovered,
  jobAnalysisDraftSchema,
  migrateCandidateProfileToMobilityProfile,
  orchestrateJobDecision,
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

function getFirstTargetCountry(
  profileTargetCountries: string,
  jobLocation: string,
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

// The final cross-domain decision this route enforces: role/skill fit
// (evaluateAutoTimeFitScore, unchanged/live elsewhere) composed with
// cross-border legal evidence (assessInternationalJob, optionally backed by
// a live Stamp4 statutory-threshold check for the countries it covers)
// through orchestrateJobDecision - "the only boundary allowed to issue a
// final cross-domain job decision" per its own doc comment. Previously this
// route only consulted the deprecated evaluateCountryFit, which has no
// Stamp4/international awareness at all - a job could pass this gate while
// the same job/country got a genuinely different, Stamp4-verified answer on
// the International Module page. "Skip"/"Insufficient evidence" block
// generation (matches the old gate's "confirmed blocker" semantics);
// "Apply"/"Stretch application"/"Investigate first" don't (matches the old
// gate's "ready"/"stretch" - a hard blocker was the only thing that stopped
// generation before).
async function getContentGuardrailIssues(
  body: z.infer<typeof requestSchema>,
): Promise<string[]> {
  const missing = [
    !body.profile.baseCvText.trim() && "CV text",
    !body.profile.targetRoles.trim() && "target roles",
    !body.profile.workRightDetails.trim() && "work-right details",
    !body.job.jobDescription.trim() && "job description",
  ].filter(Boolean) as string[]

  const candidatePosition =
    body.context?.candidatePosition ??
    (body.profile.sponsorshipNeeded ? "foreign-candidate" : "native-candidate")
  const targetCountry =
    body.context?.targetCountry ??
    getFirstTargetCountry(body.profile.targetCountries, body.job.location)

  const fit = evaluateAutoTimeFitScore({ profile: body.profile, job: body.job })

  const internationalRequirement =
    candidatePosition === "foreign-candidate" ? "required" : "not-relevant"

  let international
  if (internationalRequirement === "required") {
    const mobilityProfile = migrateCandidateProfileToMobilityProfile(body.profile)
    const countryPack = getInternationalCountryPack(targetCountry)

    let stamp4Assessment
    if (isStamp4SponsorshipCovered(countryPack.id)) {
      const baseUrl = process.env.STAMP4_SPONSORSHIP_SERVICE_URL
      const secret = process.env.STAMP4_SPONSORSHIP_SERVICE_SECRET
      if (baseUrl && secret) {
        stamp4Assessment =
          (await fetchStamp4SponsorshipAssessment(
            {
              roleTitle: body.job.jobTitle,
              country: targetCountry,
              salary: null,
              rawText: body.job.jobDescription,
            },
            { baseUrl, secret },
          )) ?? undefined
      }
    }

    international = assessInternationalJob({
      country: targetCountry,
      mobilityProfile,
      jobText: body.job.jobDescription,
      roleDuties: body.job.jobDescription,
      occupationMapping: "not-checked",
      stamp4Assessment,
    })
  }

  const combined = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement,
  })

  return [
    ...missing.map((item) => `Missing required evidence: ${item}.`),
    ...combined.blockers,
    (combined.decision === "Skip" || combined.decision === "Insufficient evidence") &&
      `Content generation is blocked by the cross-border decision gate (${combined.decision}).`,
  ].filter(Boolean) as string[]
}

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

    await assertAiRouteRateLimit(user.id)
    const reservationId = await reserveAiCall(user.id)

    const guardrailIssues = await getContentGuardrailIssues(body)

    if (guardrailIssues.length > 0) {
      await releaseAiCall(reservationId)
      return diagnosticJson({
        area: "ai",
        code: "ai.content.guardrail.blocked",
        data: null,
        error: `Content generation blocked: ${guardrailIssues.join(" ")}`,
        request,
        status: 422,
      })
    }

    trackApplicationKitGenerated({
      route: "/api/ai/content",
      status: "started",
    })
    let result
    try {
      result = await generateContentWithOpenAI(body)
    } catch (error: unknown) {
      await releaseAiCall(reservationId)
      throw error
    }

    await finalizeAiCall(reservationId, {
      feature: "application-content",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    })

    return jsonResponse({
      data: { content: result.value },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
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
