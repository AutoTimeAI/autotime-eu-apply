import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
import { ESCO_CACHE_VERSION, ROLE_PATHWAYS_SCHEMA_VERSION } from "shared"
export default async function Page() {
  await requireAdminPrincipal("market_data:read")
  return <AdminSection title="Market Data" description="Governed provider and version visibility. No unauthorised job-platform scraping." items={[
    { label: "Live market provider", value: "Not instrumented" },
    { label: "ESCO version", value: ESCO_CACHE_VERSION },
    { label: "Schema version", value: String(ROLE_PATHWAYS_SCHEMA_VERSION) },
    { label: "Next refresh", value: "Not scheduled" }
  ]} />
}
