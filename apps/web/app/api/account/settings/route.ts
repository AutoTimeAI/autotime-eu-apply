/**
 * GET/PATCH /api/account/settings
 *
 * Reads and updates the caller's account preferences (AI tone, default
 * region, notifications toggle), stored in the `account_settings` table.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401.
 *
 * Behaviour: degrades gracefully if the `account_settings` table has not
 * been migrated yet (`isMissingAccountSettingsTable`) — GET returns the
 * hard-coded `defaultSettings` with an explanatory `error` message and
 * status 200, and PATCH echoes back the requested values with status 202
 * instead of persisting them.
 */
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
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
  notificationsEnabled: false,
}

const missingSettingsStorageMessage =
  "Account settings storage is not deployed yet. Defaults are available, but saving preferences requires the Supabase account_settings migration."

const settingsSchema = z.object({
  aiTone: z.enum(["concise", "coaching", "detailed"]).optional(),
  defaultRegion: z.string().trim().min(1).max(120).optional(),
  notificationsEnabled: z.boolean().optional(),
})

function jsonResponse(
  body: ApiResponse<AccountSettingsData>,
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
    notificationsEnabled: row.notifications_enabled,
  }
}

function isMissingAccountSettingsTable(error: {
  code?: string
  message?: string
}) {
  const message = error.message?.toLowerCase() ?? ""

  return (
    error.code === "PGRST200" ||
    error.code === "PGRST205" ||
    (message.includes("account_settings") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("could not find the table")))
  )
}

/**
 * Returns the caller's current account settings, or defaults if none are
 * stored (or if the `account_settings` table is not yet deployed).
 *
 * Responses:
 * - 200: settings data (persisted or default).
 * - 401: no authenticated user.
 * - 500: unexpected read error.
 * - 503: backing configuration unavailable.
 */
export async function GET(
  request: NextRequest,
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
        status: 401,
      })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("account_settings")
      .select("ai_tone, default_region, notifications_enabled")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      if (isMissingAccountSettingsTable(error)) {
        return jsonResponse({
          data: defaultSettings,
          error: missingSettingsStorageMessage,
          status: 200,
        })
      }

      return diagnosticJson({
        area: "account",
        code: "account.settings.read.failed",
        data: null,
        error: error.message,
        log: true,
        request,
        status: 500,
      })
    }

    return jsonResponse({
      data: data ? mapSettingsRow(data) : defaultSettings,
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "account",
        code: "account.settings.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    return diagnosticJson({
      area: "account",
      code: "account.settings.read.unexpected",
      data: null,
      error:
        error instanceof Error ? error.message : "Account settings read failed",
      log: true,
      request,
      status: 500,
    })
  }
}

/**
 * Validates the request body against `settingsSchema` (all fields
 * optional) and upserts the merged settings for the caller, keyed on
 * `user_id`.
 *
 * Request body (JSON, all optional): `aiTone` (one of
 * "concise"|"coaching"|"detailed"), `defaultRegion` (1-120 char string),
 * `notificationsEnabled` (boolean). Omitted fields fall back to the
 * existing stored value, then to `defaultSettings`.
 *
 * Responses:
 * - 200: updated settings persisted and returned.
 * - 202: `account_settings` table not yet deployed — requested values are
 *   echoed back but not persisted.
 * - 400: request body fails schema validation.
 * - 401: no authenticated user.
 * - 500: unexpected read/write error.
 * - 503: backing configuration unavailable.
 */
export async function PATCH(
  request: NextRequest,
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
        status: 401,
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
      if (isMissingAccountSettingsTable(readError)) {
        return jsonResponse({
          data: {
            aiTone: body.aiTone ?? defaultSettings.aiTone,
            defaultRegion: body.defaultRegion ?? defaultSettings.defaultRegion,
            notificationsEnabled:
              body.notificationsEnabled ?? defaultSettings.notificationsEnabled,
          },
          error: missingSettingsStorageMessage,
          status: 202,
        })
      }

      return diagnosticJson({
        area: "account",
        code: "account.settings.patch.read.failed",
        data: null,
        error: readError.message,
        log: true,
        request,
        status: 500,
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
      user_id: user.id,
    }
    const { data, error } = await supabase
      .from("account_settings")
      .upsert(nextSettings, { onConflict: "user_id" })
      .select("ai_tone, default_region, notifications_enabled")
      .single()

    if (error) {
      if (isMissingAccountSettingsTable(error)) {
        return jsonResponse({
          data: mapSettingsRow(nextSettings),
          error: missingSettingsStorageMessage,
          status: 202,
        })
      }

      return diagnosticJson({
        area: "account",
        code: "account.settings.write.failed",
        data: null,
        error: error.message,
        log: true,
        request,
        status: 500,
      })
    }

    return jsonResponse({
      data: mapSettingsRow(data),
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "account",
        code: "account.settings.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    if (error instanceof z.ZodError) {
      return diagnosticJson({
        area: "account",
        code: "account.settings.request.invalid",
        data: null,
        error: "Invalid account settings body",
        request,
        status: 400,
      })
    }

    return diagnosticJson({
      area: "account",
      code: "account.settings.write.unexpected",
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Account settings write failed",
      log: true,
      request,
      status: 500,
    })
  }
}
