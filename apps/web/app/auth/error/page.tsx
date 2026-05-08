import Link from "next/link"

type AuthErrorPageProps = {
  searchParams?: Promise<{
    message?: string
    stage?: string
  }>
}

export default async function AuthErrorPage({
  searchParams
}: AuthErrorPageProps) {
  const params = await searchParams
  const stage = params?.stage ?? "unknown"
  const message = params?.message ?? "Please return to the sign-in page and try again."

  return (
    <main className="dashboard-shell">
      <section className="rich-empty-state">
        <p className="eyebrow">Authentication</p>
        <h1>Sign-in could not be completed</h1>
        <p>
          Your session could not be created. Please return to the sign-in page
          and try again.
        </p>
        <p className="status-banner">
          Stage: {stage}. {message}
        </p>
        <div className="header-actions">
          <Link className="primary-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
