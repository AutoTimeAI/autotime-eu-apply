import { AdminRealtimeConsole } from "./AdminRealtimeConsole";
import { requireAdminPageAccess } from "../../lib/admin-authorization";
import { getAdminOverview } from "../../lib/admin-monitoring";

export const dynamic = "force-dynamic";

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
