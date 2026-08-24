/**
 * GET /api/admin/audit-log
 *
 * Returns the admin audit log (`getAdminAuditLog`) for the admin dashboard.
 *
 * Auth: admin-only. `requireAdminRequest` requires the `audit:read`
 * permission; unauthenticated/unauthorized callers get a sanitized error
 * via `safeAdminError`.
 *
 * Response is marked `private, no-store` and the route is force-dynamic.
 */
import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getAdminAuditLog } from "../../../../lib/admin-audit";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

/**
 * Loads and returns the admin audit log for callers with `audit:read`.
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` audit log payload.
 * - non-200: sanitized error via `safeAdminError`.
 */
export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "audit:read");
    const data = await getAdminAuditLog();
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "audit_log_load");
  }
}
