import { type NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "../../../../lib/api-auth"
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error"
import { createAdminClient } from "../../../../lib/supabase/admin"
import { diagnosticJson } from "../../../../lib/diagnostics"
import { exportedTables } from "../../../../lib/account-export"

// GDPR Article 20 (right to data portability). The exported set matches
// every table with an ON DELETE CASCADE ownership link to auth.users(id),
// except genuine operational/metering tables (operational_logs, ai_usage,
// ai_credit_ledger, sync_events, extension_connections,
// deleted_application_tombstones, workflow_operational_events - non-content
// telemetry about the account, not data the user provided or generated)
// and admin_memberships (a role assignment record, not user content).
//
// Found and fixed 2026-08-21: this previously omitted job_workflow_*,
// interview_records/interview_questions/interview_preparation_snapshots,
// cover_letters, outreach_contacts/outreach_messages, user_skill_profile,
// esco_questionnaire_answers, and profile_revisions - all real,
// server-synced user content that an earlier version of this comment
// incorrectly described as living only in browser localStorage.
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
