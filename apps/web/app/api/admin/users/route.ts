/** Serves privacy-minimised beta-user rows to permitted administrators. */
import { NextResponse } from "next/server";
import {
  hasAdminPermission,
  requireAdminRequest,
} from "../../../../lib/admin-authorization";
import { getAdminUsersOverview } from "../../../../lib/admin-users";
import { safeAdminError } from "../../../../lib/admin-safe-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "users:read");
    const includeEmail = hasAdminPermission(
      principal.membership,
      "users:read_email",
    );
    const data = await getAdminUsersOverview(includeEmail);
    return NextResponse.json(
      { data, error: null, status: 200 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return safeAdminError(error, "users_load");
  }
}
