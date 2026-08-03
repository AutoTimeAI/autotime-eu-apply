import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"

export default async function AdminUsersPage() {
  await requireAdminPrincipal("users:read")
  return <AdminSection title="Beta users" description="Privacy-minimised account summaries. Full CVs and generated content are never shown here." items={[
    { label: "User list", value: "Available through protected API" },
    { label: "Sensitive content", value: "Not exposed" },
    { label: "Last activity", value: "Not instrumented" }
  ]} />
}
