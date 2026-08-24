/**
 * Surfaces governed market-data versions and refresh status while keeping the
 * refresh capability behind a permission separate from read access.
 */
import { ESCO_CACHE_VERSION, ROLE_PATHWAYS_SCHEMA_VERSION } from "shared"
import {
  hasAdminPermission,
  requireAdminPageAccess,
} from "../../../lib/admin-authorization"
import { getLatestAdminMarketRefreshRequest } from "../../../lib/admin-market-data"
import { AdminMarketRefreshStatus } from "./AdminMarketRefreshStatus"

/** Loads version and refresh state for an authorised market-data reader. */
export default async function Page() {
  const principal = await requireAdminPageAccess("market_data:read")
  const canRefresh = hasAdminPermission(principal.membership, "market_data:refresh")
  const latestRequest = await getLatestAdminMarketRefreshRequest()

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Market Data</h1>
          <p>
            Governed provider and version visibility. No unauthorised
            job-platform scraping.
          </p>
        </div>
      </header>
      <section aria-label="Catalogue versions" className="operations-admin-grid">
        <article>
          <span>Live market provider</span>
          <strong>Not instrumented</strong>
          <p>No live provider is integrated; ESCO data is a versioned fixture.</p>
        </article>
        <article>
          <span>ESCO version</span>
          <strong>{ESCO_CACHE_VERSION}</strong>
        </article>
        <article>
          <span>Schema version</span>
          <strong>{ROLE_PATHWAYS_SCHEMA_VERSION}</strong>
        </article>
      </section>
      <AdminMarketRefreshStatus canRefresh={canRefresh} initialRequest={latestRequest} />
    </main>
  )
}
