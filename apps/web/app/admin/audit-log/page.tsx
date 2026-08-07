import { requireAdminPrincipal } from "../../../lib/admin-authorization"
import { getAdminAuditLog } from "../../../lib/admin-audit"
import { AdminAuditLogTable } from "./AdminAuditLogTable"

export default async function Page() {
  await requireAdminPrincipal("audit:read")
  const events = await getAdminAuditLog()

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Audit Log</h1>
          <p>
            Append-only privacy-minimised records for material admin
            actions.
          </p>
        </div>
      </header>
      <section aria-label="Audit policy" className="operations-admin-grid">
        <article>
          <span>Editing history</span>
          <strong>Prohibited</strong>
          <p>Enforced by an append-only database trigger.</p>
        </article>
        <article>
          <span>Retention</span>
          <strong>Not yet configured</strong>
          <p>24 months during private beta is the documented target; no automated deletion runs yet.</p>
        </article>
      </section>
      <AdminAuditLogTable initialEvents={events} />
    </main>
  )
}
