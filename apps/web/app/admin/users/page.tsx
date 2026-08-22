import {
  hasAdminPermission,
  requireAdminPrincipal,
} from "../../../lib/admin-authorization"
import { getAdminUsersOverview } from "../../../lib/admin-users"
import { AdminUsersTable } from "./AdminUsersTable"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const principal = await requireAdminPrincipal("users:read")
  const includeEmail = hasAdminPermission(
    principal.membership,
    "users:read_email",
  )
  const requestedPage = Number((await searchParams).page ?? "1")
  const initialData = await getAdminUsersOverview(includeEmail, requestedPage)

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
      <AdminUsersTable includeEmail={includeEmail} initialData={initialData} />
    </main>
  )
}
