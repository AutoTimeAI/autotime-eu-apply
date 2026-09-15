import { requireAdminPageAccess } from "../../../lib/admin-authorization"
import { getOpenMobilityCorrections } from "../../../lib/admin-mobility-corrections"
import { AdminMobilityCorrectionQueue } from "./AdminMobilityCorrectionQueue"

export default async function Page() {
  await requireAdminPageAccess("mobility_corrections:review")
  const corrections = await getOpenMobilityCorrections()
  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Mobility governance</p>
          <h1>Decision corrections</h1>
          <p>Review disagreements without editing history. Accepted corrections require verified evidence and a successor decision.</p>
        </div>
      </header>
      <AdminMobilityCorrectionQueue initialCorrections={corrections} />
    </main>
  )
}
