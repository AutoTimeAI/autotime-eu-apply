import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { getCanonicalAppUrl } from "../../../../lib/env"
import { getAnalyticsInternalEnv } from "../../../../lib/env.server"
import { getRequestUser } from "../../../../lib/api-auth"

// apps/analytics (a separate Python service) is reachable directly at a
// public production URL via vercel.json's routePrefix - it has no way to
// validate a Supabase session itself, so this route is the only thing
// standing between an unauthenticated caller and that compute-heavy
// endpoint. It authenticates the request, bounds the payload size, then
// forwards to the analytics service with a shared secret only this server
// knows (apps/analytics/main.py rejects any call missing it).
const MAX_RECORDS_PER_REQUEST = 2000

const requestSchema = z.object({
  evidenceRecords: z.array(z.unknown()).max(MAX_RECORDS_PER_REQUEST).default([]),
  outcomeRecords: z.array(z.unknown()).max(MAX_RECORDS_PER_REQUEST).default([]),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error: authError } = await getRequestUser(request)

    if (authError || !user) {
      return diagnosticJson({
        area: "dashboard",
        code: "dashboard.analytics.auth.blocked",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(rawBody)

    if (!parsed.success) {
      return diagnosticJson({
        area: "dashboard",
        code: "dashboard.analytics.request.invalid",
        data: null,
        error: "Invalid analytics payload.",
        request,
        status: 400,
      })
    }

    const { secret } = getAnalyticsInternalEnv()
    const analyticsUrl = new URL(
      "/analytics/evidence-outcomes",
      getCanonicalAppUrl(),
    )

    const upstream = await fetch(analyticsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-analytics-secret": secret,
      },
      body: JSON.stringify(parsed.data),
    })

    const upstreamBody = await upstream.text()

    if (!upstream.ok) {
      return diagnosticJson({
        area: "dashboard",
        code: "dashboard.analytics.upstream.failed",
        data: null,
        error: "Analytics service is temporarily unavailable.",
        log: true,
        request,
        status: 502,
      })
    }

    return new NextResponse(upstreamBody, {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error)) {
      return diagnosticJson({
        area: "dashboard",
        code: "dashboard.analytics.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    }

    return diagnosticJson({
      area: "dashboard",
      code: "dashboard.analytics.unexpected",
      data: null,
      error: "Analytics report unavailable.",
      log: true,
      request,
      status: 500,
    })
  }
}
