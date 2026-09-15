/**
 * Runs the former Stamp4 sponsorship engine in-process for an authenticated
 * EU Apply user. The route contract is retained for the existing UI, while
 * the retired standalone deployment and shared service secret are no longer
 * runtime dependencies. Unsupported countries still return null data.
 */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assessSponsorshipReadiness, isStamp4SponsorshipCovered } from "shared"
import { getRequestUser } from "../../../../lib/api-auth"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { recordExternalAssessmentSnapshot } from "../../../../platform/mobility-external-assessment/writer"
import {
  isMobilityGovernanceEnforcementEnabled,
  loadCurrentMobilityReadiness,
} from "../../../../platform/application-preparation/mobility-governance-repository"

const requestSchema = z.object({
  countryPackId: z.string().trim().min(1),
  roleTitle: z.string().trim().min(1),
  country: z.string().trim().min(1),
  salary: z.string().trim().nullable().optional(),
  rawText: z.string().optional(),
  domainKeywords: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
})

type ApiResponse<T> = { data: T | null; error: string | null }

function jsonResponse<T>(body: ApiResponse<T>, status: number) {
  return NextResponse.json(body, { status })
}

export async function POST(request: NextRequest) {
  const { user, error: userError } = await getRequestUser(request)
  if (userError || !user) {
    return jsonResponse({ data: null, error: "Sign in to check official sponsorship thresholds." }, 401)
  }

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return jsonResponse({ data: null, error: "Check the job details supplied for this check." }, 400)
  }

  if (!isStamp4SponsorshipCovered(body.countryPackId)) {
    return jsonResponse({ data: null, error: null }, 200)
  }

  const governanceEnabled = isMobilityGovernanceEnforcementEnabled()
  const adminClient = governanceEnabled ? createAdminClient() : null
  if (governanceEnabled) {
    try {
      const governed = await loadCurrentMobilityReadiness(adminClient as never, body.country)
      if (!governed || governed.readiness.outputPermission !== "definitive") {
        return jsonResponse({
          data: null,
          error: "This country's official-threshold rules require current source and expert review before a verified result can be shown.",
        }, 409)
      }
    } catch {
      return jsonResponse({
        data: null,
        error: "Official-threshold governance status is temporarily unavailable.",
      }, 503)
    }
  }

  const requestPayload = {
    roleTitle: body.roleTitle,
    country: body.country,
    salary: body.salary ?? null,
    rawText: body.rawText,
    domainKeywords: body.domainKeywords,
    requiredSkills: body.requiredSkills,
    responsibilities: body.responsibilities,
  }
  const assessment = assessSponsorshipReadiness(requestPayload)

  // Best-effort immutable input/output capture for audit and replay. A
  // snapshot failure never withholds the assessment already computed.
  if (governanceEnabled) {
    void recordExternalAssessmentSnapshot({
      client: adminClient as never,
      provider: "autotime-stamp4-integrated",
      endpoint: "/api/international/stamp4-check",
      request: requestPayload,
      response: assessment as unknown as Record<string, unknown> | null,
      httpStatus: 200,
      covered: true,
    })
  }

  return jsonResponse({ data: assessment, error: null }, 200)
}
