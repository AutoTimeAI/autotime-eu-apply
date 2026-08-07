import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../lib/configuration-error"
import { createAdminClient } from "../../../lib/supabase/admin"
import { createServerClient } from "../../../lib/supabase/server"
import { diagnosticJson } from "../../../lib/diagnostics"
import { isTestAuthUserId } from "../../../lib/test-auth"

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

    const { error: deleteError } = await createAdminClient().auth.admin.deleteUser(
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
