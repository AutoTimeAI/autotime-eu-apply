import "server-only"
import type { DiagnosticPayload } from "./diagnostics"
import { createAdminClient } from "./supabase/admin"
import type { Json } from "./supabase/types"

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
