import { NextResponse } from "next/server";
import {
  AdminAuthorizationError,
  isSameOriginMutation,
  requireAdminRequest,
} from "../../../../lib/admin-authorization";
import {
  adminFeatureFlagKeys,
  isAdminFeatureFlagKey,
  safeAdminFeatureFlagDefaults,
} from "../../../../lib/admin-feature-flags";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request, "feature_flags:read");
    const { data, error } = await createAdminClient()
      .from("admin_feature_flags")
      .select("key, enabled, environment, version, updated_at");
    if (error) throw new Error();
    return NextResponse.json(
      {
        data: { defaults: safeAdminFeatureFlagDefaults, overrides: data ?? [] },
        error: null,
        status: 200,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "feature_flags_load");
  }
}

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
