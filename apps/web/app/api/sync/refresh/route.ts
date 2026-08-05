import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { runSessionRefresh } from "../../../../lib/sync-refresh-core"
import {
  getConfigurationFailure,
} from "../../../../lib/configuration-error"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type RefreshSessionData = {
  authToken: string
  refreshToken: string
  expiresAt: number
}

function jsonResponse(
  body: ApiResponse<RefreshSessionData>,
): NextResponse<ApiResponse<RefreshSessionData>> {
  return NextResponse.json(body, { status: body.status })
}

/**
 * The extension stores a Supabase access token captured once, at connect
 * time. Access tokens expire (Supabase default is one hour), and the
 * extension has no Supabase SDK and no way to renew that token on its own.
 * Once it expired, every sync call silently fell back to local-only
 * tracking with no way to recover until the user manually reconnected.
 *
 * This route lets the extension exchange its stored refresh token for a
 * fresh access token using the same public anon key the dashboard already
 * uses, so the extension can keep its session alive in the background.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RefreshSessionData>>> {
  try {
    const result = await runSessionRefresh(await request.json(), (url, anonKey) =>
      createClient(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    )

    if (result.kind === "invalid") {
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.request.invalid",
        data: null,
        error: "A refresh token is required.",
        request,
        status: 400,
      })
    }

    if (result.kind === "unauthorised") {
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.session.failed",
        data: null,
        error: result.message,
        log: true,
        request,
        status: 401,
      })
    }

    return jsonResponse({
      data: {
        authToken: result.authToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    const configurationFailure = getConfigurationFailure(error)
    if (configurationFailure) {
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.unavailable",
        data: null,
        error: configurationFailure.error,
        request,
        status: configurationFailure.status,
      })
    }
    const message =
      error instanceof Error ? error.message : "Session refresh failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.refresh.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
