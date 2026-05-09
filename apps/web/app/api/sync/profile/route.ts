import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { candidateProfileSchema } from "shared"
import { getRequestUser } from "../../../../lib/api-auth"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { isProUser } from "../../../../lib/feature-gate"
import { readSyncedProfile, syncProfile } from "../../../../lib/cloud-sync"

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

type ProfileSyncRouteData = {
  synced: true
}

type ProfileReadRouteData = {
  profile: z.infer<typeof candidateProfileSchema> | null
}

type ProfileDeleteRouteData = {
  deleted: true
}

function jsonResponse(
  body: ApiResponse<ProfileSyncRouteData>
): NextResponse<ApiResponse<ProfileSyncRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function readJsonResponse(
  body: ApiResponse<ProfileReadRouteData>
): NextResponse<ApiResponse<ProfileReadRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function deleteJsonResponse(
  body: ApiResponse<ProfileDeleteRouteData>
): NextResponse<ApiResponse<ProfileDeleteRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

function getSourceSurface(request: NextRequest): "web" | "extension" {
  return request.headers.get("x-autotime-source") === "extension"
    ? "extension"
    : "web"
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProfileReadRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    if (!(await isProUser(user.id))) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.plan.not-pro",
        data: null,
        error: "Cloud sync requires a Pro plan",
        request,
        status: 403
      })
    }

    const result = await readSyncedProfile(createAdminClient(), user.id)

    if (!result.success) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.read.failed",
        data: null,
        error: result.error,
        log: true,
        request,
        status: 500
      })
    }

    return readJsonResponse({
      data: { profile: result.profile },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Synced profile read failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.profile.read.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProfileSyncRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    if (!(await isProUser(user.id))) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.plan.not-pro",
        data: null,
        error: "Cloud sync requires a Pro plan",
        request,
        status: 403
      })
    }

    const profile = candidateProfileSchema.parse(await request.json())
    const result = await syncProfile(
      createAdminClient(),
      user.id,
      profile,
      getSourceSurface(request)
    )

    if (!result.success) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.write.failed",
        data: null,
        error: result.error,
        log: true,
        request,
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
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.request.invalid",
        data: null,
        error: "Invalid request body",
        request,
        status: 400
      })
    }

    const message =
      error instanceof Error ? error.message : "Profile sync failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.profile.failed",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ProfileDeleteRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401
      })
    }

    if (!(await isProUser(user.id))) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.plan.not-pro",
        data: null,
        error: "Cloud sync requires a Pro plan",
        request,
        status: 403
      })
    }

    const supabase = createAdminClient()
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (readError) {
      return diagnosticJson({
        area: "sync",
        code: "sync.profile.delete.read-failed",
        data: null,
        error: readError.message,
        log: true,
        request,
        status: 500
      })
    }

    if (profile) {
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", user.id)

      if (deleteError) {
        return diagnosticJson({
          area: "sync",
          code: "sync.profile.delete.failed",
          data: null,
          error: deleteError.message,
          log: true,
          request,
          status: 500
        })
      }

      await supabase.from("sync_events").insert({
        user_id: user.id,
        entity_type: "profile",
        entity_id: profile.id,
        source_surface: getSourceSurface(request),
        action: "deleted",
        message: "Profile deleted from dashboard account",
        schema_version: 1
      })
    }

    return deleteJsonResponse({
      data: { deleted: true },
      error: null,
      status: 200
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Profile delete failed"

    return diagnosticJson({
      area: "sync",
      code: "sync.profile.delete.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500
    })
  }
}
