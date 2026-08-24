/**
 * GET /api/admin/feedback
 *
 * Returns the admin dashboard's user-feedback overview
 * (`getAdminFeedbackOverview`).
 *
 * Auth: admin-only. `requireAdminRequest` requires the `feedback:read`
 * permission; unauthenticated/unauthorized callers get a sanitized error
 * via `safeAdminError`.
 *
 * Response is marked `private, no-store` and the route is force-dynamic.
 */
import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getAdminFeedbackOverview } from "../../../../lib/admin-feedback";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

/**
 * Loads and returns the feedback overview for admins with `feedback:read`.
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` feedback overview payload.
 * - non-200: sanitized error via `safeAdminError`.
 */
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
