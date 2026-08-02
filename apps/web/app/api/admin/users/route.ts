import { NextResponse } from "next/server";
import {
  AdminAuthorizationError,
  hasAdminPermission,
  requireAdminRequest,
} from "../../../../lib/admin-authorization";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "users:read");
    const includeEmail = hasAdminPermission(
      principal.membership,
      "users:read_email",
    );
    const admin = createAdminClient();
    const [{ data, error }, beta] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 50 }),
      admin.from("beta_access").select("user_id, status, updated_at"),
    ]);
    if (error || beta.error) throw new Error("user_source_unavailable");
    const betaByUser = new Map(
      (beta.data ?? []).map((row) => [row.user_id, row]),
    );
    return NextResponse.json(
      {
        data: data.users.map((user) => ({
          betaStatus: betaByUser.get(user.id)?.status ?? "not_enrolled",
          createdAt: user.created_at,
          email: includeEmail ? (user.email ?? null) : undefined,
          id: user.id,
          lastActiveAt: user.last_sign_in_at ?? null,
        })),
        error: null,
        status: 200,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "users_load");
  }
}
