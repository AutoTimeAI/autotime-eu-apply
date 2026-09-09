/**
 * Proxies an authenticated user's request to Stamp4's real
 * legal-eligibility check (sponsorship-engine reconciliation) - kept
 * server-side because the request carries STAMP4_SPONSORSHIP_SERVICE_SECRET,
 * which must never reach the browser. Returns null data (200, not an error)
 * for countries Stamp4 doesn't cover, or when Stamp4 is unreachable -
 * assessInternationalJob already falls back correctly to its own
 * text-signal/evidence-first checks when no stamp4Assessment is supplied.
 */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fetchStamp4SponsorshipAssessment, isStamp4SponsorshipCovered } from "shared"
import { getRequestUser } from "../../../../lib/api-auth"

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

  const baseUrl = process.env.STAMP4_SPONSORSHIP_SERVICE_URL
  const secret = process.env.STAMP4_SPONSORSHIP_SERVICE_SECRET
  if (!baseUrl || !secret) {
    return jsonResponse({ data: null, error: null }, 200)
  }

  const assessment = await fetchStamp4SponsorshipAssessment(
    {
      roleTitle: body.roleTitle,
      country: body.country,
      salary: body.salary ?? null,
      rawText: body.rawText,
      domainKeywords: body.domainKeywords,
      requiredSkills: body.requiredSkills,
      responsibilities: body.responsibilities,
    },
    { baseUrl, secret },
  )

  return jsonResponse({ data: assessment, error: null }, 200)
}
