import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { diagnosticJson } from "../../../../lib/diagnostics"

// Tables holding this user's own data, each with a user_id column and an
// ON DELETE CASCADE foreign key to auth.users(id). Jobs and applications
// captured in the Phase 3B workflow live only in browser localStorage
// (see lib/job-workflow-storage.ts) and are out of scope here — there is
// nothing server-side to export for them.
const exportedTables = [
  "profiles",
  "account_settings",
  "subscriptions",
  "mobility_profiles",
  "user_accounts",
  "applications",
  "evidence_records",
  "outcome_records",
  "interview_prep_packs",
  "reusable_answers",
  "beta_access",
] as const

// GDPR Article 20 (right to data portability). Operational/metering
// tables (operational_logs, ai_usage, sync_events, extension_connections)
// are intentionally excluded: they are non-content telemetry about the
// account, not data the user provided or generated.
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error: userError } = await getRequestUser(request)

    if (userError || !user) {
      return diagnosticJson({
        area: "account",
        code: "account.export.auth.missing-user",
        data: null,
        error: "Unauthorised",
        request,
        status: 401,
      })
    }

    const admin = createAdminClient()
    const results = await Promise.all(
      exportedTables.map(async (table) => {
        const { data, error } = await admin
          .from(table)
          .select("*")
          .eq("user_id", user.id)
        return [table, error ? [] : (data ?? [])] as const
      }),
    )

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email ?? null,
      data: Object.fromEntries(results),
    }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=\"eu-apply-account-export.json\"",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return diagnosticJson({
        area: "account",
        code: "account.export.unavailable",
        data: null,
        error: configurationUnavailableMessage,
        request,
        status: 503,
      })
    const message =
      error instanceof Error ? error.message : "Account export failed"

    return diagnosticJson({
      area: "account",
      code: "account.export.unexpected",
      data: null,
      error: message,
      log: true,
      request,
      status: 500,
    })
  }
}
