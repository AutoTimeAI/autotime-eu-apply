/**
 * POST /api/admin/users/[userId]/beta-access
 *
 * Sets a target user's beta-access status (active/suspended) via the
 * `admin_change_beta_access` Postgres RPC.
 *
 * Auth: admin-only. Requires the `users:manage_beta` permission via
 * `requireAdminRequest`, plus a same-origin check
 * (`isSameOriginMutation`) that rejects cross-origin requests with 403.
 *
 * Behaviour: validates the `userId` route param as a UUID and requires a
 * non-empty (>= 4 char) `reason` string when suspending a user.
 */
import { NextResponse } from "next/server";
import {
  AdminAuthorizationError,
  isSameOriginMutation,
  requireAdminRequest,
} from "../../../../../../lib/admin-authorization";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { safeAdminError } from "../../../../../../lib/admin-safe-response";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Updates the beta-access status for the user identified by the `userId`
 * route param.
 *
 * Request body (JSON): `status` (must be "active" or "suspended");
 * `reason` (string, required and must be >= 4 chars after trimming when
 * `status` is "suspended").
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` updated beta-access row.
 * - 400: invalid `userId` (not a UUID), invalid `status`, or missing/short
 *   `reason` for a suspension.
 * - 403: cross-origin request.
 * - non-2xx: sanitized error via `safeAdminError` for RPC/unexpected
 *   failures.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const principal = await requireAdminRequest(request, "users:manage_beta");
    if (!isSameOriginMutation(request))
      return NextResponse.json(
        { data: null, error: "Invalid origin", status: 403 },
        { status: 403 },
      );
    const { userId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    if (
      !uuid.test(userId) ||
      !["active", "suspended"].includes(String(body.status)) ||
      (body.status === "suspended" &&
        (typeof body.reason !== "string" || body.reason.trim().length < 4))
    ) {
      return NextResponse.json(
        {
          data: null,
          error: "A valid user, status and suspension reason are required",
          status: 400,
        },
        { status: 400 },
      );
    }
    const statusValue = body.status === "suspended" ? "suspended" : "active";
    const { data, error } = await createAdminClient().rpc(
      "admin_change_beta_access",
      {
        p_actor_user_id: principal.user.id,
        p_reason: typeof body.reason === "string" ? body.reason : "",
        p_status: statusValue,
        p_target_user_id: userId,
      },
    );
    if (error || !data?.[0]) throw new Error("beta_access_rpc_failed");
    return NextResponse.json({ data: data[0], error: null, status: 200 });
  } catch (error) {
    return safeAdminError(error, "beta_access_update");
  }
}
