import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { createAdminClient } from "../../../../lib/supabase/admin"

type ExtensionConnectData = {
  connected: true
}

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

const extensionConnectSchema = z.object({
  extensionId: z.string().trim().min(1).max(256),
})

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ExtensionConnectData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.extension.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const body = extensionConnectSchema.parse(await request.json())
    const supabase = createAdminClient()
    const { error } = await supabase.from("extension_connections").upsert(
      {
        user_id: user.id,
        extension_id: body.extensionId,
        browser_label: "Chrome extension",
        last_connected_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "user_id,extension_id" },
    )

    if (error) {
      return diagnosticJson({
        area: "sync",
        code: "sync.extension.write.failed",
        data: null,
        error: error.message,
        log: true,
        request,
        status: 500,
      })
    }

    return NextResponse.json({
      data: { connected: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "sync",
        code: "sync.extension.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.extension.request.invalid",
        data: null,
        error: "Invalid request body",
        request,
        status: 400,
      })
    }

    return diagnosticJson({
      area: "sync",
      code: "sync.extension.failed",
      data: null,
      error:
        error instanceof Error ? error.message : "Extension connection failed",
      log: true,
      request,
      status: 500,
    })
  }
}
