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
      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">AutoTime EU Apply</p>
          <h1>Your UK/EU job search, organised and AI-assisted</h1>
          <p>
            Sign in to connect your dashboard, billing plan and cloud-ready
            account. OAuth only for the first production release.
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
        {status ? <p className="status-banner">{status}</p> : null}
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
