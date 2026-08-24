/**
 * GET /api/account/me
 *
 * Returns a minimal profile summary (email, subscription plan, auth
 * provider) for the currently signed-in user.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without an authenticated user (or without an email on the user record)
 * receive 401.
 *
 * Behaviour: looks up the user's plan via `getUserPlan` (feature-gate
 * lookup) and reads the auth provider from `user.app_metadata.provider`,
 * defaulting to `"email"` when absent.
 */
import { type NextRequest, NextResponse } from "next/server"
import { getUserPlan } from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"
import type { SubscriptionPlan } from "../../../../lib/supabase/types"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type AccountMeData = {
  email: string
  plan: SubscriptionPlan
  provider: string
}

function getAuthProvider(user: {
  app_metadata?: { provider?: string }
}): string {
  return user.app_metadata?.provider ?? "email"
}

function jsonResponse(
  body: ApiResponse<AccountMeData>,
): NextResponse<ApiResponse<AccountMeData>> {
  return NextResponse.json(body, { status: body.status })
}

/**
 * Returns `{ email, plan, provider }` for the authenticated caller.
 *
 * Responses:
 * - 200: account summary data.
 * - 401: no authenticated user, or user has no email.
 * - 503: backing configuration unavailable.
 * - 500: unexpected error.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<AccountMeData>>> {
  try {
    const { user } = await getRequestUser(request)

    if (!user?.email) {
      return diagnosticJson({
        area: "account",
        code: "account.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const plan = await getUserPlan(user.id)

    return jsonResponse({
      data: {
        email: user.email,
        plan,
        provider: getAuthProvider(user),
      },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "account",
        code: "account.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    const message =
      error instanceof Error ? error.message : "Unable to read account"

    return diagnosticJson({
      area: "account",
      code: "account.read.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
