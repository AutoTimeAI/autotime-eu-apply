/**
 * Client-side helper for reporting browser-side errors back to the server's
 * diagnostics endpoint. Exists as a client-safe counterpart to the
 * server-only ./diagnostics module, since browser code cannot write
 * directly to operational_logs and instead POSTs a best-effort report that
 * the server persists and redacts.
 */
"use client"

export type ClientDiagnosticArea =
  | "account"
  | "ai"
  | "auth"
  | "billing"
  | "dashboard"
  | "env"
  | "extension"
  | "stripe"
  | "supabase"
  | "sync"

type ClientDiagnosticMetadata = Record<string, string | number | boolean | null>

type ClientDiagnosticInput = {
  area: ClientDiagnosticArea
  code: string
  message: string
  metadata?: ClientDiagnosticMetadata
}

/** Extracts a human-readable message from `error`, or `fallback` if it isn't an Error instance. */
export function getClientErrorMessage(
  error: unknown,
  fallback = "Unexpected error"
): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Fire-and-forget POST to /api/diagnostics/client reporting a client-side
 * issue, tagged with the current page path. No-ops on the server (checks
 * `window`) and swallows any network failure, so calling this can never
 * itself throw or block the caller.
 */
export function reportClientIssue({
  area,
  code,
  message,
  metadata = {}
}: ClientDiagnosticInput): void {
  if (typeof window === "undefined") {
    return
  }

  void fetch("/api/diagnostics/client", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-autotime-source": "web"
    },
    body: JSON.stringify({
      area,
      code,
      message,
      metadata: {
        ...metadata,
        path: window.location.pathname
      }
    })
  }).catch(() => undefined)
}
