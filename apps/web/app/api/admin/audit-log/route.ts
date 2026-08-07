import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getAdminAuditLog } from "../../../../lib/admin-audit";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

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
