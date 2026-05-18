import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { createAdminClient } from "../../../../lib/supabase/admin"
import type { AccountAiTone } from "../../../../lib/supabase/types"

type AccountSettingsData = {
  aiTone: AccountAiTone
  defaultRegion: string
  notificationsEnabled: boolean
}

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

const defaultSettings: AccountSettingsData = {
  aiTone: "coaching",
  defaultRegion: "United Kingdom",
  notificationsEnabled: false
}

const settingsSchema = z.object({
  aiTone: z.enum(["concise", "coaching", "detailed"]).optional(),
  defaultRegion: z.string().trim().min(1).max(120).optional(),
  notificationsEnabled: z.boolean().optional()
})

function jsonResponse(
  body: ApiResponse<AccountSettingsData>
): NextResponse<ApiResponse<AccountSettingsData>> {
  return NextResponse.json(body, { status: body.status })
}

function mapSettingsRow(row: {
  ai_tone: AccountAiTone
  default_region: string
  notifications_enabled: boolean
}): AccountSettingsData {
  return {
    aiTone: row.ai_tone,
    defaultRegion: row.default_region,
    notificationsEnabled: row.notifications_enabled
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AccountSettingsData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("account_settings")
      .select("ai_tone, default_region, notifications_enabled")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.read.failed",
        data: null,
        error: error.message,
        log: true,
        request,
        status: 500
      })
    }

    return jsonResponse({
      data: data ? mapSettingsRow(data) : defaultSettings,
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    return diagnosticJson({
      area: "account",
      code: "account.settings.read.unexpected",
      data: null,
      error:
        error instanceof Error ? error.message : "Account settings read failed",
      log: true,
      request,
      status: 500
    })
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AccountSettingsData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    const body = settingsSchema.parse(await request.json())
    const supabase = createAdminClient()
    const { data: existing, error: readError } = await supabase
      .from("account_settings")
      .select("ai_tone, default_region, notifications_enabled")
      .eq("user_id", user.id)
      .maybeSingle()

    if (readError) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.patch.read.failed",
        data: null,
        error: readError.message,
        log: true,
        request,
        status: 500
      })
    }

    const nextSettings = {
      ai_tone: body.aiTone ?? existing?.ai_tone ?? defaultSettings.aiTone,
      default_region:
        body.defaultRegion ??
        existing?.default_region ??
        defaultSettings.defaultRegion,
      notifications_enabled:
        body.notificationsEnabled ??
        existing?.notifications_enabled ??
        defaultSettings.notificationsEnabled,
      user_id: user.id
    }
    const { data, error } = await supabase
      .from("account_settings")
      .upsert(nextSettings, { onConflict: "user_id" })
      .select("ai_tone, default_region, notifications_enabled")
      .single()

    if (error) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.write.failed",
        data: null,
        error: error.message,
        log: true,
        request,
        status: 500
      })
    }

    return jsonResponse({
      data: mapSettingsRow(data),
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.request.invalid",
        data: null,
        error: "Invalid account settings body",
        request,
        status: 400
      })
    }

    return diagnosticJson({
      area: "account",
      code: "account.settings.write.unexpected",
      data: null,
      error:
        error instanceof Error ? error.message : "Account settings write failed",
      log: true,
      request,
      status: 500
    })
  }
}
