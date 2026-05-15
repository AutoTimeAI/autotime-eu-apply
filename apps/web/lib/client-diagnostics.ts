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

export function getClientErrorMessage(
  error: unknown,
  fallback = "Unexpected error"
): string {
  return error instanceof Error ? error.message : fallback
}

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
