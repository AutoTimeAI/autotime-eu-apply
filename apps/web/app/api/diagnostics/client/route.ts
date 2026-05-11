import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  createDiagnostic,
  diagnosticJson,
  logDiagnostic
} from "../../../../lib/diagnostics"

const clientDiagnosticSchema = z.object({
  area: z.enum(["dashboard", "extension", "sync"]),
  code: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(500),
  metadata: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional()
})

type ClientDiagnosticData = {
  logged: true
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ data: ClientDiagnosticData | null; error: string | null; status: number }>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "dashboard",
        code: "diagnostics.client.auth.blocked",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    const payload = clientDiagnosticSchema.parse(await request.json())
    const diagnostic = createDiagnostic({
      area: payload.area,
      code: payload.code,
      message: payload.message,
      request,
      status: 500
    })

    logDiagnostic(diagnostic, {
      ...(payload.metadata ?? {}),
      clientReported: true,
      userId: user.id
    })

    return NextResponse.json({
      data: { logged: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "dashboard",
        code: "diagnostics.client.request.invalid",
        data: null,
        error: "Invalid client diagnostic body",
        request,
        status: 400
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
      status: 500
    })
  }
}
