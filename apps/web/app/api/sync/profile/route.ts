import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { candidateProfileSchema } from "shared"
import { isProUser } from "../../../../lib/feature-gate"
import { syncProfile } from "../../../../lib/cloud-sync"
import { createServerClient } from "../../../../lib/supabase/server"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type ProfileSyncRouteData = {
  synced: true
}

function jsonResponse(
  body: ApiResponse<ProfileSyncRouteData>
): NextResponse<ApiResponse<ProfileSyncRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProfileSyncRouteData>>> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ data: null, error: "Unauthorised", status: 401 })
    }

    if (!(await isProUser(user.id))) {
      return jsonResponse({
        data: null,
        error: "Cloud sync requires a Pro plan",
        status: 403
      })
    }

    const profile = candidateProfileSchema.parse(await request.json())
    const result = await syncProfile(supabase, user.id, profile)

    if (!result.success) {
      return jsonResponse({
        data: null,
        error: result.error,
        status: 500
      })
    }

    return jsonResponse({
      data: { synced: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ data: null, error: "Invalid request body", status: 400 })
    }

    const message =
      error instanceof Error ? error.message : "Profile sync failed"

    return jsonResponse({ data: null, error: message, status: 500 })
  }
}
