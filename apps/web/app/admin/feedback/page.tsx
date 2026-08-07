import { requireAdminPrincipal } from "../../../lib/admin-authorization"
import { getAdminFeedbackOverview } from "../../../lib/admin-feedback"
import { AdminFeedbackTable } from "./AdminFeedbackTable"

export default async function Page() {
  await requireAdminPrincipal("feedback:read")
  const feedback = await getAdminFeedbackOverview()

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Feedback</h1>
          <p>
            Structured private-beta feedback, sourced live from the
            beta_feedback table. No automatic user messaging is triggered by
            viewing or updating status here.
          </p>
        </div>
      </header>
      <AdminFeedbackTable initialFeedback={feedback} />
    </main>
  )
}
