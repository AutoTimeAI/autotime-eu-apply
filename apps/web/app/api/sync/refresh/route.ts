import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { runSessionRefresh } from "../../../../lib/sync-refresh-core"
import {
  getConfigurationFailure,
} from "../../../../lib/configuration-error"
import { createAdminClient } from "../../../../lib/supabase/admin"

// This route is deliberately unauthenticated by design - it exchanges a
// client-held Supabase refresh token for a new access token, mirroring
// Supabase's own token endpoint, since the extension has no way to call
// Supabase directly. But every call still triggers a real request to
// Supabase's Auth service (a genuine external-API cost against this
// project's quota) regardless of whether the supplied token is valid, and
// an unauthorised result additionally logs a diagnostic entry (a DB
// write) - with zero rate limiting, this was a free, unauthenticated,
// unbounded-cost endpoint. There's no session to key a limit on, so this
// keys by a salted IP hash instead - the same pattern already used for the
// other unauthenticated write in this codebase, api/compatibility/reports.
const REFRESH_RATE_LIMIT_WINDOW_SECONDS = 60
const REFRESH_RATE_LIMIT_MAX_REQUESTS = 10

class RefreshRateLimitError extends Error {}

function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

async function assertRefreshRateLimit(request: NextRequest): Promise<void> {
  const ip = getRequestIp(request)
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  const rateLimitKey = `sync-refresh:${createHash("sha256")
    .update(`${salt}:${ip}`)
    .digest("hex")}`

  const { data, error } = await createAdminClient().rpc(
    "increment_ai_rate_limit",
    {
      p_rate_limit_key: rateLimitKey,
      p_window_seconds: REFRESH_RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: REFRESH_RATE_LIMIT_MAX_REQUESTS,
    },
  )

  if (error) throw error
  if (!data) throw new RefreshRateLimitError()
}

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
    await assertRefreshRateLimit(request)

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
    if (error instanceof RefreshRateLimitError) {
      // Deliberately not passing the diagnostic-logging flag here - logging
      // every rate-limited hit would itself be an unbounded-cost DB write
      // on the exact path this limit exists to close off.
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.rate_limited",
        data: null,
        error: "Too many refresh attempts. Please try again shortly.",
        request,
        status: 429,
      })
    }
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
