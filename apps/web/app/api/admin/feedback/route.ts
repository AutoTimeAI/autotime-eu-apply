import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getAdminFeedbackOverview } from "../../../../lib/admin-feedback";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "feedback:read");
    const data = await getAdminFeedbackOverview();
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "feedback_load");
  }
}
