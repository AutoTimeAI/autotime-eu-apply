/**
 * Renders the live operations overview and limits enhanced detail to owner or
 * admin roles after an explicit overview permission check.
 */
import { AdminRealtimeConsole } from "./AdminRealtimeConsole";
import { redirect } from "next/navigation";
import {
  AdminAuthorizationError,
  requireAdminPrincipal,
} from "../../lib/admin-authorization";
import { getAdminOverview } from "../../lib/admin-monitoring";

export const dynamic = "force-dynamic";

/** Redirects denied operators before retrieving the live admin overview. */
export default async function AdminPage() {
  let principal;
  try {
    principal = await requireAdminPrincipal("overview:read");
  } catch (error) {
    if (error instanceof AdminAuthorizationError)
      redirect(
        error.status === 401 ? "/admin/login" : "/admin/login?adminDenied=1",
      );
    throw error;
  }
  return (
    <AdminRealtimeConsole
      initialOverview={await getAdminOverview(
        principal.membership.role === "owner" ||
          principal.membership.role === "admin",
      )}
    />
  );
}
