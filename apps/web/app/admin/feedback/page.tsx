import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
export default async function Page() {
  await requireAdminPrincipal("feedback:read")
  return <AdminSection title="Feedback" description="Structured private-beta feedback without automatic user messaging." items={[
    { label: "Unresolved feedback", value: "Available after migration" },
    { label: "Email automation", value: "Disabled" }
  ]} />
}
