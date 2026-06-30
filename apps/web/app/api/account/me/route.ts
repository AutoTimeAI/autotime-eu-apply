import { type NextRequest, NextResponse } from "next/server"
import { getUserPlan } from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"
import { diagnosticJson } from "../../../../lib/diagnostics"
import type { SubscriptionPlan } from "../../../../lib/supabase/types"

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

function getAuthProvider(user: { app_metadata?: { provider?: string } }): string {
  return user.app_metadata?.provider ?? "email"
}

function jsonResponse(
  body: ApiResponse<AccountMeData>
): NextResponse<ApiResponse<AccountMeData>> {
  return NextResponse.json(body, { status: body.status })
}

export async function GET(
  request: NextRequest
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
        status: 401
      })
    }

    const plan = await getUserPlan(user.id)

    return jsonResponse({
      data: {
        email: user.email,
        plan,
        provider: getAuthProvider(user)
      },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to read account"

    return diagnosticJson({
      area: "account",
      code: "account.read.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
