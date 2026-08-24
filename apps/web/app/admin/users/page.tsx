/**
 * Loads privacy-minimised beta account summaries and reveals email addresses
 * only when the operator holds the additional email-read permission.
 */
import {
  hasAdminPermission,
  requireAdminPrincipal,
} from "../../../lib/admin-authorization"
import { getAdminUsersOverview } from "../../../lib/admin-users"
import { AdminUsersTable } from "./AdminUsersTable"

/** Requires user-read access and passes the narrower email policy to the UI. */
export default async function AdminUsersPage() {
  const principal = await requireAdminPrincipal("users:read")
  const includeEmail = hasAdminPermission(
    principal.membership,
    "users:read_email",
  )
  const users = await getAdminUsersOverview(includeEmail)

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Beta users</h1>
          <p>
            Privacy-minimised account summaries, sourced live from Supabase
            auth and beta access. Full CVs and generated content are never
            shown here.
          </p>
        </div>
      </header>
      <AdminUsersTable includeEmail={includeEmail} initialUsers={users} />
    </main>
  )
}
