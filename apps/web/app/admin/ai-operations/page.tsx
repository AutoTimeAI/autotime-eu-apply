import { AdminSection } from "../../../components/AdminSection"
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
export default async function Page() {
  await requireAdminPrincipal("ai_operations:read")
  return <AdminSection title="AI Operations" description="Privacy-safe provider activity. Prompts, API keys, CVs and generated application content are excluded." items={[
    { label: "NVIDIA developer endpoint", value: process.env.NVIDIA_API_KEY ? "Configured server-side" : "Unavailable" },
    { label: "Prompt visibility", value: "Prohibited" },
    { label: "Provider failure categories", value: "Operational logs" }
  ]} />
}
