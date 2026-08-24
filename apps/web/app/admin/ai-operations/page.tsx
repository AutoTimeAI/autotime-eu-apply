/**
 * Shows privacy-minimised AI provider health to operators permitted to inspect
 * AI activity; sensitive prompts and generated user content stay excluded.
 */
import { requireAdminPrincipal } from "../../../lib/admin-authorization"
import { getAdminAiOperationsOverview } from "../../../lib/admin-ai-operations"
import { AdminAiOperationsLog } from "./AdminAiOperationsLog"

/** Requires AI-operations read access before loading the provider overview. */
export default async function Page() {
  await requireAdminPrincipal("ai_operations:read")
  const overview = await getAdminAiOperationsOverview()

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>AI Operations</h1>
          <p>
            Privacy-safe provider activity. Prompts, API keys, CVs and
            generated application content are excluded.
          </p>
        </div>
      </header>
      <section aria-label="Provider configuration" className="operations-admin-grid">
        <article>
          <span>NVIDIA developer endpoint</span>
          <strong>
            {overview.nvidiaConfigured ? "Configured server-side" : "Unavailable"}
          </strong>
        </article>
        <article>
          <span>Prompt visibility</span>
          <strong>Prohibited</strong>
        </article>
      </section>
      <AdminAiOperationsLog initialFailures={overview.recentFailures} />
    </main>
  )
}
