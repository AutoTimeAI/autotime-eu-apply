import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../lib/configuration-error"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"
import { createDiagnosticId, diagnosticJson, logDiagnostic } from "../../../lib/diagnostics"
import { isTestAuthUserId } from "../../../lib/test-auth"

// Supabase Storage objects have no foreign key to auth.users - only an RLS
// policy scoping them by folder name to auth.uid() - so ON DELETE CASCADE
// never reaches them. Without this, deleting an account leaves the user's
// profile photo (a real personal image) permanently orphaned in the
// "profile-photos" bucket, which is itself a GDPR Article 17 completeness
// gap. Best-effort and non-blocking: a storage hiccup shouldn't prevent a
// user from deleting their account outright, so a failure here is logged
// for manual cleanup rather than surfaced as a deletion failure.
async function deleteProfilePhotos(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  try {
    const { data: objects, error: listError } = await client.storage
      .from("profile-photos")
      .list(userId)
    if (listError || !objects?.length) return
    const paths = objects.map((object) => `${userId}/${object.name}`)
    const { error: removeError } = await client.storage
      .from("profile-photos")
      .remove(paths)
    if (removeError) throw removeError
  } catch (error: unknown) {
    logDiagnostic(
      {
        area: "account",
        code: "account.delete.profile-photo-cleanup-failed",
        id: createDiagnosticId(),
        level: "warn",
        message: "Account deleted, but profile photo storage cleanup failed.",
        timestamp: new Date().toISOString(),
      },
      { userId, error: error instanceof Error ? error.message : String(error) },
    )
  }
}

type AccountDeleteRouteData = {
  deleted: true
}

type ApiResponse<T> = {
  data: T | null
  error: string | null
  status: number
}

function deleteJsonResponse(
  body: ApiResponse<AccountDeleteRouteData>,
): NextResponse<ApiResponse<AccountDeleteRouteData>> {
  return NextResponse.json(body, { status: body.status })
}

// GDPR Article 17 (right to erasure). This removes the auth.users row
// itself, not just the profiles row — every per-user table in the schema
// (profiles, subscriptions, mobility_profiles, applications,
// evidence_records, outcome_records, interview_prep_packs,
// reusable_answers, account_settings, user_accounts,
// extension_connections, beta_access) has ON DELETE CASCADE on its
// user_id foreign key, so deleting the auth user cascades correctly.
// admin_audit_events and market_refresh_requests intentionally use ON
// DELETE RESTRICT for actor/requester columns, so an admin account with
// audit history cannot self-delete here — that is a deliberate audit
// integrity safeguard, not a bug; it requires manual offboarding.
// Supabase Storage objects (the profile-photos bucket) have no FK to
// auth.users, so cascade never reaches them - deleteProfilePhotos handles
// that separately, best-effort, before the auth user is removed.
export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<AccountDeleteRouteData>>> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "account",
        code: "account.delete.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    if (isTestAuthUserId(user.id)) {
      return diagnosticJson({
        area: "account",
        code: "account.delete.test-auth-unsupported",
        data: null,
        error: "Account deletion is unavailable for the test session.",
        request,
        status: 400,
      })
    }

    const adminClient = createAdminClient()
    await deleteProfilePhotos(adminClient, user.id)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id,
    )

    if (deleteError) {
      return diagnosticJson({
        area: "account",
        code: "account.delete.failed",
        data: null,
        error: deleteError.message,
        log: true,
        request,
        status: 500,
      })
    }

    const supabase = await createServerClient()
    await supabase.auth.signOut()

    return deleteJsonResponse({
      data: { deleted: true },
      error: null,
      status: 200,
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "account",
        code: "account.delete.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    const message =
      error instanceof Error ? error.message : "Account deletion failed"

    return diagnosticJson({
      area: "account",
      code: "account.delete.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
