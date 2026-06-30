import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { publicEnv } from "../../../../lib/env"

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

const refreshRequestSchema = z.object({
  refreshToken: z.string().trim().min(1)
})

function jsonResponse(
  body: ApiResponse<RefreshSessionData>
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
  request: NextRequest
): Promise<NextResponse<ApiResponse<RefreshSessionData>>> {
  try {
    const body = refreshRequestSchema.safeParse(await request.json())

    if (!body.success) {
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.request.invalid",
        data: null,
        error: "A refresh token is required.",
        request,
        status: 400
      })
    }

    const supabase = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: body.data.refreshToken
    })

    if (error || !data.session) {
      return diagnosticJson({
        area: "sync",
        code: "sync.refresh.session.failed",
        data: null,
        error: error?.message ?? "Could not refresh session. Sign in again.",
        log: true,
        request,
        status: 401
      })
    }

    return jsonResponse({
      data: {
        authToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt:
          (data.session.expires_at ??
            Math.floor(Date.now() / 1000) + data.session.expires_in) * 1000
      },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Session refresh failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.refresh.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
