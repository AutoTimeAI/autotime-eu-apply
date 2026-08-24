/**
 * POST /api/admin/market-data/refresh
 *
 * Requests an ESCO market-data refresh via the `admin_request_market_
 * refresh` Postgres RPC.
 *
 * Auth: admin-only. Requires the `market_data:refresh` permission via
 * `requireAdminRequest`, plus a same-origin check (`isSameOriginMutation`)
 * that rejects cross-origin requests with 403.
 *
 * Behaviour: requires explicit confirmation in the body plus a caller-
 * supplied idempotency key, and the RPC itself can report a "rate_limited"
 * outcome (surfaced as 429) if refreshes are being requested too
 * frequently.
 */
import { NextResponse } from "next/server";
import {
  AdminAuthorizationError,
  isSameOriginMutation,
  requireAdminRequest,
} from "../../../../../lib/admin-authorization";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { safeAdminError } from "../../../../../lib/admin-safe-response";

/**
 * Validates and submits a market-data refresh request.
 *
 * Request body (JSON): `confirm` (must be exactly `true`), `provider`
 * (must be exactly `"esco"`), `idempotencyKey` (string, 12-80 chars,
 * `[a-zA-Z0-9_-]`).
 *
 * Responses:
 * - 202: `{ data, error: null, status: 202 }` refresh request accepted.
 * - 400: missing/invalid confirmation, provider, or idempotency key.
 * - 403: cross-origin request.
 * - 429: RPC reports the request is rate-limited.
 * - non-2xx: sanitized error via `safeAdminError` for RPC/unexpected
 *   failures.
 */
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "market_data:refresh");
    if (!isSameOriginMutation(request))
      return NextResponse.json(
        { data: null, error: "Invalid origin", status: 403 },
        { status: 403 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    if (
      body.confirm !== true ||
      body.provider !== "esco" ||
      typeof body.idempotencyKey !== "string" ||
      !/^[a-zA-Z0-9_-]{12,80}$/.test(body.idempotencyKey)
    ) {
      return NextResponse.json(
        {
          data: null,
          error:
            "Explicit confirmation, ESCO provider and valid idempotency key are required",
          status: 400,
        },
        { status: 400 },
      );
    }
    const { data, error } = await createAdminClient().rpc(
      "admin_request_market_refresh",
      {
        p_actor_user_id: principal.user.id,
        p_idempotency_key: body.idempotencyKey,
      },
    );
    if (error || !data?.[0]) throw new Error("market_refresh_rpc_failed");
    if (data[0].outcome === "rate_limited")
      return NextResponse.json(
        {
          data: null,
          error: "The operation could not be completed.",
          status: 429,
        },
        { status: 429 },
      );
    return NextResponse.json(
      { data: data[0], error: null, status: 202 },
      { status: 202 },
    );
  } catch (error) {
    return safeAdminError(error, "market_refresh_request");
  }
}
