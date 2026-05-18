import Link from "next/link"

function getSafeParam(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value

  return text?.trim().slice(0, 220) ?? ""
}

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : {}
  const message = getSafeParam(params.message)
  const stage = getSafeParam(params.stage)

  return (
    <main className="dashboard-shell">
      <section className="rich-empty-state">
        <p className="eyebrow">Authentication</p>
        <h1>Sign-in could not be completed</h1>
        <p>
          {message ||
            "Your session could not be created. Please return to the sign-in page and try again."}
        </p>
        {stage ? <p>Stage: {stage}</p> : null}
        <div className="header-actions">
          <Link className="primary-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
