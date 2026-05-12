"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { publicEnv } from "../lib/env"
import { createBrowserClient } from "../lib/supabase/client"

type OAuthProvider = "github" | "google"

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Sign-in could not be started. Please try again."
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string | null>(
    searchParams.get("loggedOut") ? "You have been signed out." : null
  )
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"

  const handleSignIn = async (provider: OAuthProvider) => {
    try {
      setStatus(null)

      const supabase = createBrowserClient()
      const callbackUrl = new URL(
        "/auth/callback",
        publicEnv.NEXT_PUBLIC_APP_URL
      )
      callbackUrl.searchParams.set("redirectTo", redirectTo)

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString()
        }
      })

      if (error) {
        setStatus(error.message)
      }
    } catch (error: unknown) {
      setStatus(getErrorMessage(error))
    }
  }

  return (
    <main className="auth-shell">

      <section className="auth-intro" aria-labelledby="auth-intro-title">
        <div>
          <p className="eyebrow">AutoTime · Borderless Apply</p>
          <h1 id="auth-intro-title">
            Your EU job search,<br />
            without the guesswork.
          </h1>
          <p>
            Know your fit before you apply. Transparent gap scoring, risk flags,
            and next actions — built for cross-border European tech candidates.
            You review everything. Nothing submits without you.
          </p>
        </div>

        <div className="auth-proof-grid" aria-label="Product strengths">
          <div>
            <strong>EU cross-border</strong>
            <span>
              Country fit, visa risk, and market context. No US-only assumptions.
            </span>
          </div>
          <div>
            <strong>No auto-submit</strong>
            <span>
              You approve every application. No bots, no hidden steps, no spam risk.
            </span>
          </div>
          <div>
            <strong>Transparent scoring</strong>
            <span>
              Gaps, risks, and next actions shown clearly before you commit effort.
            </span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Sign in</p>
          <h2>Open your dashboard</h2>
          <p>
            Track roles, check fit, generate interview prep packs — all
            in one workspace built for the EU market.
          </p>
        </div>

        <div className="header-actions">
          <button type="button" onClick={() => handleSignIn("github")}>
            Sign in with GitHub
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => handleSignIn("google")}
          >
            Sign in with Google
          </button>
        </div>

        <p className="auth-privacy-note">
          EU-hosted analytics only · No email used for tracking · Your data is
          never sold or shared
        </p>
      </section>

    </main>
  )
}

export function LoginContent() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
