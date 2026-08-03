import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
export default async function Page() {
  await requireAdminPrincipal("audit:read")
  return <AdminSection title="Audit Log" description="Append-only privacy-minimised records for material admin actions." items={[
    { label: "Editing history", value: "Prohibited" },
    { label: "Retention", value: "Not yet configured" }
  ]} />
}
