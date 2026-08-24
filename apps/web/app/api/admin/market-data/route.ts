/**
 * GET /api/admin/market-data
 *
 * Returns the most recent admin-initiated market-data refresh request
 * (`getLatestAdminMarketRefreshRequest`), used to show refresh status in
 * the admin dashboard.
 *
 * Auth: admin-only. `requireAdminRequest` requires the `market_data:read`
 * permission; unauthenticated/unauthorized callers get a sanitized error
 * via `safeAdminError`.
 *
 * Response is marked `private, no-store` and the route is force-dynamic.
 */
import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-authorization";
import { getLatestAdminMarketRefreshRequest } from "../../../../lib/admin-market-data";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

/**
 * Loads and returns the latest market-data refresh request for admins
 * with `market_data:read`.
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` latest refresh-request row.
 * - non-200: sanitized error via `safeAdminError`.
 */
export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "market_data:read");
    const data = await getLatestAdminMarketRefreshRequest();
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "market_data_load");
  }
}
