/**
 * Turns any error thrown from an admin API route into a NextResponse that
 * never leaks internal error detail to the client - unexpected errors are
 * logged server-side with a correlation ID and returned as a generic
 * message, while known error types (config unavailable, authorization
 * failure) get their appropriate status and a still-generic message. Exists
 * so every admin route can share one "fail safely" response shape instead
 * of each one deciding what is safe to expose.
 */
import "server-only";
import { NextResponse } from "next/server";
import { AdminAuthorizationError } from "./admin-authorization";
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "./configuration-error";
import { getAdminPublicStatus } from "./admin-error-policy";

/**
 * Logs a warning with a generated diagnostic ID and a truncated (80-char)
 * category label, and returns that ID so it can be surfaced to the client
 * for correlation without exposing the underlying error.
 */
export function createSafeDiagnostic(category: string) {
  const diagnosticId = crypto.randomUUID();
  console.warn("autotime_admin_operation_failed", {
    category: category.slice(0, 80),
    diagnosticId,
    timestamp: new Date().toISOString(),
  });
  return diagnosticId;
}
/**
 * Converts `error` into a client-safe JSON NextResponse: a
 * configuration-unavailable error becomes a 503 with the standard
 * unavailable message, an AdminAuthorizationError keeps its own 401/403
 * status with a generic message, and anything else is logged via
 * createSafeDiagnostic and returned as `status` (default 500) with a
 * diagnosticId. All responses set `Cache-Control: private, no-store`.
 */
export function safeAdminError(error: unknown, category: string, status = 500) {
  const publicStatus = getAdminPublicStatus(error, status);
  if (publicStatus === 503 && isConfigurationUnavailableError(error))
    return NextResponse.json(
      { data: null, error: configurationUnavailableMessage, status: 503 },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  if (error instanceof AdminAuthorizationError)
    return NextResponse.json(
      {
        data: null,
        error: "The operation could not be completed.",
        status: error.status,
      },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  const diagnosticId = createSafeDiagnostic(category);
  return NextResponse.json(
    {
      data: null,
      error: "The operation could not be completed.",
      diagnosticId,
      status: publicStatus,
    },
    { status: publicStatus, headers: { "Cache-Control": "private, no-store" } },
  );
}
