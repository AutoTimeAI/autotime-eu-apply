import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <main className="dashboard-shell">
      <section className="rich-empty-state">
        <p className="eyebrow">Authentication</p>
        <h1>Sign-in could not be completed</h1>
        <p>
          Your session could not be created. Please return to the sign-in page
          and try again.
        </p>
        <div className="header-actions">
          <Link href="/login">
            <button type="button">Back to sign in</button>
          </Link>
        </div>
      </section>
    </main>
  )
}
