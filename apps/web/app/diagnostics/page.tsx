import { redirect } from "next/navigation"
import { getEnvReadiness } from "../../lib/diagnostics"
import { createServerClient } from "../../lib/supabase/server"

export const dynamic = "force-dynamic"

const scenarioChecks = [
  {
    title: "Sign in",
    checks:
      "NEXT_PUBLIC_APP_URL, Supabase URL/anon key, Supabase OAuth providers, and provider callback URLs."
  },
  {
    title: "Dashboard",
    checks:
      "Supabase auth session, service role access for subscription lookup, and profile/local storage readiness."
  },
  {
    title: "Stripe billing",
    checks:
      "Publishable key, secret key, webhook secret, monthly/annual price IDs, and /api/stripe/webhook."
  },
  {
    title: "AI features",
    checks:
      "OpenAI key, authenticated user, rate limit, free/pro feature gate, and AI usage tracking."
  },
  {
    title: "Cloud sync",
    checks:
      "Cloud sync flag, Supabase auth session, profile bridge fields, user consent, and RLS."
  },
  {
    title: "Extension connect",
    checks:
      "Extension ID in redirect URL, browser extension messaging, account API, and Supabase access token."
  }
]

export default async function DiagnosticsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login?redirectTo=/diagnostics")
  }

  const envReadiness = getEnvReadiness()

  return (
    <main className="legal-shell">
      <header className="legal-header">
        <div>
          <p className="eyebrow">Diagnostics</p>
          <h1>AutoTime product readiness</h1>
          <p>
            Safe runtime checks for auth, billing, AI, sync, analytics and
            extension flows. Values are never displayed.
          </p>
        </div>
      </header>

      <section className="legal-section">
        <h2>Environment readiness</h2>
        <div className="diagnostic-grid">
          {envReadiness.map((item) => (
            <article
              className={item.configured ? "diagnostic-item ready" : "diagnostic-item missing"}
              key={item.name}
            >
              <strong>{item.name}</strong>
              <span>{item.configured ? "Configured" : "Missing"}</span>
              <small>{item.exposure}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="legal-section">
        <h2>Scenario coverage</h2>
        <div className="diagnostic-grid">
          {scenarioChecks.map((scenario) => (
            <article className="diagnostic-item" key={scenario.title}>
              <strong>{scenario.title}</strong>
              <p>{scenario.checks}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
