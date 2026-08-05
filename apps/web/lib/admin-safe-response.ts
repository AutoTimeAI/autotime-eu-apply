import "server-only";
import { NextResponse } from "next/server";
import { AdminAuthorizationError } from "./admin-authorization";
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "./configuration-error";
import { getAdminPublicStatus } from "./admin-error-policy";

export function createSafeDiagnostic(category: string) {
  const diagnosticId = crypto.randomUUID();
  console.warn("autotime_admin_operation_failed", {
    category: category.slice(0, 80),
    diagnosticId,
    timestamp: new Date().toISOString(),
  });
  return diagnosticId;
}
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
