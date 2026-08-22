import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import {
  assertDiagnosticRouteRateLimit,
  createDiagnostic,
  diagnosticJson,
  logDiagnostic,
} from "../../../../lib/diagnostics"

const clientDiagnosticSchema = z.object({
  area: z.enum([
    "account",
    "ai",
    "auth",
    "billing",
    "dashboard",
    "env",
    "extension",
    "stripe",
    "supabase",
    "sync",
  ]),
  code: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  metadata: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
})

type ClientDiagnosticData = {
  logged: true
}

export async function POST(request: NextRequest): Promise<
  NextResponse<{
    data: ClientDiagnosticData | null
    error: string | null
    status: number
  }>
> {
  try {
    const payload = clientDiagnosticSchema.parse(await request.json())
    const { user } = await getRequestUser(request)

    const allowed = await assertDiagnosticRouteRateLimit(request, user?.id ?? null)
    if (!allowed) {
      return NextResponse.json(
        {
          data: null,
          error: "Too many diagnostic reports. Please try again shortly.",
          status: 429,
        },
        { status: 429 },
      )
    }

    const diagnostic = createDiagnostic({
      area: payload.area,
      code: payload.code,
      message: payload.message,
      request,
      status: 500,
    })

    logDiagnostic(diagnostic, {
      ...(payload.metadata ?? {}),
      authenticated: Boolean(user),
      clientReported: true,
      userId: user?.id ?? null,
    })

    return NextResponse.json({
      data: { logged: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "auth",
        code: "diagnostics.client.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "dashboard",
        code: "diagnostics.client.request.invalid",
        data: null,
        error: "Invalid client diagnostic body",
        request,
        status: 400,
      })
    }

    return diagnosticJson({
      area: "dashboard",
      code: "diagnostics.client.failed",
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Client diagnostic logging failed",
      log: true,
      request,
      status: 500,
    })
  }
}
