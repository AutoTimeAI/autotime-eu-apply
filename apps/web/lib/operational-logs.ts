// Server-only helper that writes a DiagnosticPayload (see ./diagnostics) into
// the `operational_logs` table for later admin-side review, using the
// service-role Supabase client. Deliberately fail-open: a logging failure
// swallows itself (falling back to a console warning) rather than surfacing
// as an error to whatever request triggered the log, since operational
// logging must never be the reason a user-facing request fails.
import "server-only"
import type { DiagnosticPayload } from "./diagnostics"
import { createAdminClient } from "./supabase/admin"
import type { Json } from "./supabase/types"

/** Deep-clones `value` through a JSON round-trip so it's safe to store as the `metadata` Json column (drops functions/undefined, throws on cycles). */
function toJsonObject(value: Record<string, unknown> | undefined): Json {
  if (!value) {
    return {}
  }

  return JSON.parse(JSON.stringify(value)) as Json
}

export async function persistOperationalLog({
  details,
  diagnostic
}: {
  details?: Record<string, unknown>
  diagnostic: DiagnosticPayload
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from("operational_logs").insert({
      area: diagnostic.area,
      code: diagnostic.code,
      diagnostic_id: diagnostic.id,
      http_status: diagnostic.status ?? null,
      level: diagnostic.level,
      message: diagnostic.message,
      metadata: toJsonObject(details),
      request_method: diagnostic.method ?? null,
      request_path: diagnostic.path ?? null
    })
  } catch (error: unknown) {
    console.warn("autotime_operational_log_persist_failed", {
      diagnosticId: diagnostic.id,
      reason: error instanceof Error ? error.message : "Unknown persistence error"
    })
  }
}
