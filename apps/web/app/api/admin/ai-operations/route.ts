/** Serves privacy-minimised AI operations health to permitted administrators. */
import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getAdminAiOperationsOverview } from "../../../../lib/admin-ai-operations";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "ai_operations:read");
    const data = await getAdminAiOperationsOverview();
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "ai_operations_load");
  }
}
