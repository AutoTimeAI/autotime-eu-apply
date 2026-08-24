import { createHash } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import loggingConfig from "../../../config/monitoring/logging.json"
import { getRequestIp } from "./request-ip"
import { redactSensitiveUrlText, redactSensitiveValue } from "./sentry-privacy"
import { createAdminClient } from "./supabase/admin"

export type DiagnosticLevel = "severe" | "warn" | "info"

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
  level: DiagnosticLevel
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

function getDiagnosticLevel(status: number | undefined): DiagnosticLevel {
  if (typeof status !== "number") {
    return "info"
  }

  if (status >= 500) {
    return loggingConfig.rules.httpStatus["500-599"] as DiagnosticLevel
  }

  if (status >= 400) {
    return loggingConfig.rules.httpStatus["400-499"] as DiagnosticLevel
  }

  return loggingConfig.rules.httpStatus["200-399"] as DiagnosticLevel
}

// Layers two mechanisms rather than picking one: the config-driven
// doNotLog list is this app's own explicit blocklist (e.g. "service_role",
// which the broader pattern below doesn't cover) and is kept so nothing
// currently relying on it silently loses coverage; sentry-privacy's
// redactSensitiveValue adds the same recursive, regex-based key matching
// (apikey/cookie/cv/phone/token/etc.) and free-text key=value scanning
// already used for the Sentry pipeline, since this shallower,
// exact-key-only check previously had no equivalent for common spellings
// like "token", "cv", "resume", "jobDescription", or "phone", and never
// looked past the top level of a nested object.
function sanitizeDetails(details: Record<string, unknown> | undefined) {
  if (!details) {
    return undefined
  }

  const blocked = new Set(loggingConfig.privacy.doNotLog.map((item) => item.toLowerCase()))

  const configRedacted = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      blocked.has(key.toLowerCase()) ? "[redacted]" : value
    ])
  )

  return redactSensitiveValue(configRedacted) as Record<string, unknown>
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

export function getValidationIssueMessage({
  fallback,
  issues,
  prefix
}: {
  fallback: string
  issues: Array<{ path: PropertyKey[] }>
  prefix: string
}): string {
  const fields = issues
    .map((issue) => issue.path.map(String).join("."))
    .filter(Boolean)

  if (fields.length === 0) {
    return fallback
  }

  return `${prefix}: ${fields.join(", ")}.`
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
    level: getDiagnosticLevel(status),
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
  const sanitizedDetails = sanitizeDetails(details)
  // diagnostic.message was previously never redacted at all - only the
  // separate `details` argument was. /api/diagnostics/client is a public,
  // optionally-unauthenticated endpoint that accepts an arbitrary
  // client-supplied message string, persisted verbatim into
  // operational_logs (later readable through the admin monitoring UI) and
  // logged to console. Redact it the same way free-text values are
  // scanned for embedded secrets elsewhere in this codebase.
  const sanitizedDiagnostic: DiagnosticPayload = {
    ...diagnostic,
    message: redactSensitiveUrlText(diagnostic.message)
  }
  const payload = {
    ...sanitizedDiagnostic,
    details: sanitizedDetails,
    diagnosticId: diagnostic.id
  }

  if (process.env.NEXT_RUNTIME !== "edge") {
    void import("./operational-logs").then(({ persistOperationalLog }) =>
      persistOperationalLog({ details: sanitizedDetails, diagnostic: sanitizedDiagnostic })
    ).catch(() => undefined)
  }

  if (sanitizedDiagnostic.level === "severe") {
    console.error("autotime_diagnostic", payload)
    return
  }

  if (sanitizedDiagnostic.level === "warn") {
    console.warn("autotime_diagnostic", payload)
    return
  }

  console.info("autotime_diagnostic", payload)
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

  if (log || status >= 400) {
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
    "STRIPE_PRO_QUARTERLY_PRICE_ID",
    "STRIPE_AI_CREDIT_PACK_PRICE_ID",
    "ANALYTICS_INTERNAL_SECRET"
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

// /api/diagnostics/client intentionally accepts unauthenticated requests
// (it needs to capture failures that happen before a session exists, e.g.
// a login/OAuth error), and every accepted report writes a row to
// operational_logs - with no rate limit, that's an open, no-auth-required
// endpoint that lets anyone flood the database for free. Reuses the same
// atomic, serverless-safe increment_ai_rate_limit RPC already used for AI
// cost gating (generic despite the name - keyed by an arbitrary string,
// not AI-specific) rather than a new table/migration for one endpoint.
// Keyed by user id when authenticated, otherwise a salted hash of the
// client IP (never the raw IP) - mirrors the existing pattern in
// lib/coverage-report.ts's getCoverageRequesterHash.
export async function assertDiagnosticRouteRateLimit(
  request: NextRequest | Request,
  userId: string | null
): Promise<boolean> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    return true
  }

  const identity = userId
    ? `user:${userId}`
    : `ip:${createHash("sha256").update(`${secret}:${getRequestIp(request)}`).digest("hex")}`

  const { data, error } = await createAdminClient().rpc("increment_ai_rate_limit", {
    p_rate_limit_key: `diagnostic-client:${identity}`,
    p_window_seconds: 300,
    p_max_requests: 30
  })

  // Fail open on an RPC error, unlike assertAiRouteRateLimit's fail-closed
  // behaviour: this is best-effort error reporting, not a real-money AI
  // call, so a transient DB hiccup should never silently drop a user's
  // legitimate diagnostic report.
  if (error) {
    return true
  }

  return Boolean(data)
}
