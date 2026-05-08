import { NextResponse, type NextRequest } from "next/server"

export type DiagnosticArea =
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

export type DiagnosticPayload = {
  area: DiagnosticArea
  code: string
  id: string
  message: string
  method?: string
  path?: string
  status?: number
  timestamp: string
}

export type DiagnosticResponseBody<T> = {
  data: T | null
  diagnostic: DiagnosticPayload
  error: string | null
  status: number
}

function getRequestPath(request: Request | NextRequest | undefined) {
  if (!request) {
    return undefined
  }

  try {
    return new URL(request.url).pathname
  } catch {
    return undefined
  }
}

export function createDiagnosticId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `diag_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error"
): string {
  return error instanceof Error ? error.message : fallback
}

export function createDiagnostic({
  area,
  code,
  message,
  request,
  status
}: {
  area: DiagnosticArea
  code: string
  message: string
  request?: Request | NextRequest
  status?: number
}): DiagnosticPayload {
  return {
    area,
    code,
    id: createDiagnosticId(),
    message,
    method: request?.method,
    path: getRequestPath(request),
    status,
    timestamp: new Date().toISOString()
  }
}

export function logDiagnostic(
  diagnostic: DiagnosticPayload,
  details?: Record<string, unknown>
): void {
  console.error("autotime_diagnostic", {
    ...diagnostic,
    details
  })
}

export function diagnosticJson<T>({
  area,
  code,
  data,
  error,
  log = false,
  request,
  status
}: {
  area: DiagnosticArea
  code: string
  data: T | null
  error: string | null
  log?: boolean
  request?: Request | NextRequest
  status: number
}): NextResponse<DiagnosticResponseBody<T>> {
  const diagnostic = createDiagnostic({
    area,
    code,
    message: error ?? "OK",
    request,
    status
  })

  if (log || status >= 500) {
    logDiagnostic(diagnostic)
  }

  return NextResponse.json(
    {
      data,
      diagnostic,
      error,
      status
    },
    { status }
  )
}

export function hasEnvValue(name: string): boolean {
  return typeof process.env[name] === "string" && process.env[name].trim() !== ""
}

export function getEnvReadiness() {
  const publicKeys = [
    "NEXT_PUBLIC_AUTOTIME_ENV",
    "NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST"
  ]
  const serverKeys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_ANNUAL_PRICE_ID"
  ]
  const optionalKeys = ["NEXT_PUBLIC_POSTHOG_KEY"]
  const keys = [...publicKeys, ...serverKeys, ...optionalKeys]

  return keys.map((name) => ({
    configured: hasEnvValue(name),
    exposure: name.startsWith("NEXT_PUBLIC_") ? "public" : "server-only",
    name,
    required: !optionalKeys.includes(name)
  }))
}
