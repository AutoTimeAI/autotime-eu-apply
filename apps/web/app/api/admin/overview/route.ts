import { NextResponse } from "next/server";
import {
  hasAdminPermission,
  requireAdminRequest,
} from "../../../../lib/admin-authorization";
import { safeAdminError } from "../../../../lib/admin-safe-response";
import { getAdminOverview } from "../../../../lib/admin-monitoring";
import { getErrorMessage } from "../../../../lib/diagnostics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "overview:read");
    return NextResponse.json(
      {
        data: await getAdminOverview(
          hasAdminPermission(principal.membership, "audit:read"),
        ),
        error: null,
        status: 200,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    return safeAdminError(error, "overview_load");
  }
}
