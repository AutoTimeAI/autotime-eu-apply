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
          <p className="eyebrow">AutoTime EU Apply</p>
          <h1 id="auth-intro-title">
            A serious AI copilot for UK/EU job search decisions
          </h1>
          <p>
            Check role fit, keep profile evidence honest, prepare application
            answers, and track every follow-up from one workspace.
          </p>
        </div>
        <div className="auth-proof-grid" aria-label="Product strengths">
          <div>
            <strong>Transparent</strong>
            <span>Scores, risks, gaps and next actions are shown clearly.</span>
          </div>
          <div>
            <strong>User-controlled</strong>
            <span>No automatic form submission or hidden application steps.</span>
          </div>
          <div>
            <strong>ATS-aware</strong>
            <span>Imports visible job details; applications stay manual.</span>
          </div>
        </div>
      </section>

      <section className="auth-demo-panel" aria-labelledby="auth-demo-title">
        <div className="section-heading">
          <p className="eyebrow">Product walkthrough</p>
          <h2 id="auth-demo-title">See the complete workflow in under 2 minutes</h2>
          <p>
            Profile, Job Check, extension import, application content, tracker,
            interview prep and Pro upgrade.
          </p>
        </div>
        <video
          controls
          preload="metadata"
          src="/demo/autotime-first-user-demo.mp4"
        >
          Your browser does not support embedded video.
        </video>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Sign in</p>
          <h2>Your workspace is ready</h2>
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
