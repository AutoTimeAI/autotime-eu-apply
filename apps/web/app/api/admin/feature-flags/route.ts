/**
 * GET/POST /api/admin/feature-flags
 *
 * Reads the admin feature-flags overview, and updates a single flag's
 * enabled state for a given environment via a Postgres RPC.
 *
 * Auth: admin-only. GET requires `feature_flags:read`; POST requires
 * `feature_flags:write` via `requireAdminRequest`, plus a same-origin
 * check (`isSameOriginMutation`, comparing the `Origin` header — or
 * `Sec-Fetch-Site: same-origin` when no `Origin` header is sent — against
 * the request URL) that rejects cross-origin mutations with 403.
 *
 * POST uses optimistic concurrency: the caller must supply the flag's
 * `expectedVersion`, and the `admin_update_feature_flag` RPC returns a
 * "conflict" outcome (surfaced as 409) if the stored version has since
 * changed.
 */
import { NextResponse } from "next/server";
import {
  isSameOriginMutation,
  requireAdminRequest,
} from "../../../../lib/admin-authorization";
import {
  getAdminFeatureFlagsOverview,
  isAdminFeatureFlagKey,
} from "../../../../lib/admin-feature-flags";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { safeAdminError } from "../../../../lib/admin-safe-response";

/**
 * Loads and returns the feature-flags overview for admins with
 * `feature_flags:read`.
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` overview payload.
 * - non-200: sanitized error via `safeAdminError`.
 */
export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "feature_flags:read");
    const data = await getAdminFeatureFlagsOverview();
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "feature_flags_load");
  }
}

/**
 * Updates a single feature flag's `enabled` state for one environment.
 *
 * Request body (JSON, all four keys required, no extras): `key` (a valid
 * admin feature-flag key per `isAdminFeatureFlagKey`), `enabled`
 * (boolean), `environment` ("development" | "preview" | "production"),
 * `expectedVersion` (non-negative safe integer — the version last read by
 * the caller, for optimistic-concurrency conflict detection).
 *
 * Responses:
 * - 200: `{ data, error: null, status: 200 }` with the updated flag row.
 * - 403: cross-origin request (failed `isSameOriginMutation`).
 * - 409: `expectedVersion` is stale — the flag changed since it was read.
 * - 400/500: invalid request body / RPC failure / unexpected error, via
 *   `safeAdminError` (400 for `SyntaxError`, e.g. malformed JSON; 500
 *   otherwise).
 */
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "feature_flags:write");
    if (!isSameOriginMutation(request))
      return NextResponse.json(
        { data: null, error: "Invalid origin", status: 403 },
        { status: 403 },
      );
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new Error("Invalid request");
    const keys = Object.keys(body as object)
      .sort()
      .join(",");
    const { key, enabled, environment, expectedVersion } = body as Record<
      string,
      unknown
    >;
    if (
      keys !== "enabled,environment,expectedVersion,key" ||
      !isAdminFeatureFlagKey(key) ||
      typeof enabled !== "boolean" ||
      !Number.isSafeInteger(expectedVersion) ||
      Number(expectedVersion) < 0 ||
      (environment !== "development" &&
        environment !== "preview" &&
        environment !== "production")
    )
      throw new Error("Invalid request");
    const { data, error } = await createAdminClient().rpc(
      "admin_update_feature_flag",
      {
        p_actor_user_id: principal.user.id,
        p_enabled: enabled,
        p_environment: environment,
        p_expected_version: Number(expectedVersion),
        p_key: key,
      },
    );
    if (error || !data?.[0]) throw new Error("feature_flag_rpc_failed");
    if (data[0].outcome === "conflict")
      return NextResponse.json(
        {
          data: null,
          error: "The value changed after it was loaded.",
          status: 409,
        },
        { status: 409 },
      );
    return NextResponse.json({ data: data[0], error: null, status: 200 });
  } catch (error) {
    return safeAdminError(
      error,
      "feature_flag_update",
      error instanceof SyntaxError ? 400 : 500,
    );
  }
}
