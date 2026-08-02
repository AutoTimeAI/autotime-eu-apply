import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
export default async function Page() {
  await requireAdminPrincipal("feature_flags:read")
  return <AdminSection title="Feature Flags" description="Typed, environment-aware flags. No secrets or arbitrary JSON values." items={[
    { label: "Durable values", value: "Available after migration" },
    { label: "Production mutation", value: "Explicit permission required" }
  ]} />
}
