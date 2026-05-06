import { type NextRequest, NextResponse } from "next/server"
import { getUserPlan } from "../../../../lib/feature-gate"
import { getRequestUser } from "../../../../lib/api-auth"
import type { SubscriptionPlan } from "../../../../lib/supabase/types"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type AccountMeData = {
  email: string
  plan: SubscriptionPlan
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
      return jsonResponse({ data: null, error: "Unauthorised", status: 401 })
    }

    const plan = await getUserPlan(user.id)

    return jsonResponse({
      data: {
        email: user.email,
        plan
      },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to read account"

    return jsonResponse({ data: null, error: message, status: 500 })
  }
}
