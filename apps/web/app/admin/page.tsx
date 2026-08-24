/**
 * Renders the live operations overview and limits enhanced detail to owner or
 * admin roles after an explicit overview permission check.
 */
import { AdminRealtimeConsole } from "./AdminRealtimeConsole";
import { requireAdminPageAccess } from "../../lib/admin-authorization";
import { getAdminOverview } from "../../lib/admin-monitoring";

export const dynamic = "force-dynamic";

/** Redirects denied operators before retrieving the live admin overview. */
export default async function AdminPage() {
  const principal = await requireAdminPageAccess("overview:read");
  return (
    <AdminRealtimeConsole
      initialOverview={await getAdminOverview(
        principal.membership.role === "owner" ||
          principal.membership.role === "admin",
      )}
    />
  );
}
