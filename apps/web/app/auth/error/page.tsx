/**
 * Provides a bounded, user-safe authentication failure page for errors passed
 * back from the sign-in flow.
 */
import Link from "next/link"
import { getAuthErrorMessage } from "../../../lib/auth-error-messages"

function getSafeParam(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value

  return text?.trim().slice(0, 220) ?? ""
}

/** Renders trimmed error context with a route back to sign-in. */
export default async function AuthErrorPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const stage = getSafeParam(params.stage)
  const message = getAuthErrorMessage(stage)

  return (
    <main className="dashboard-shell">
      <section className="rich-empty-state">
        <p className="eyebrow">Authentication</p>
        <h1>Sign-in could not be completed</h1>
        <p>{message}</p>
        <div className="header-actions">
          <Link className="primary-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
