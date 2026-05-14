"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { createBrowserClient } from "../lib/supabase/client"

type OAuthProvider = "github" | "google"

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Sign-in could not be started. Please try again."
}

function LoginForm() {
  const searchParams = useSearchParams()
  const authError = searchParams.get("error") || searchParams.get("message")
  const [status, setStatus] = useState<string | null>(
    authError
      ? `Failed: ${authError}`
      : searchParams.get("sessionExpired")
        ? "Session expired. Sign in again to continue."
        : searchParams.get("loggedOut")
          ? "You have been signed out."
          : null
  )
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  )
  const [accountConsent, setAccountConsent] = useState(false)
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"

  useEffect(() => {
    let isMounted = true
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setStatus(`Failed: ${error.message}`)
        return
      }

      if (data.session) {
        setStatus("Already signed in. Redirecting to dashboard...")
        window.location.replace(redirectTo)
      }
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("Signed in. Redirecting to dashboard...")
        window.location.replace(redirectTo)
      }

      if (event === "SIGNED_OUT") {
        setStatus("Session expired. Sign in again to continue.")
        setPendingProvider(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [redirectTo])

  const handleSignIn = async (provider: OAuthProvider) => {
    try {
      if (!accountConsent) {
        setStatus("Please confirm account access before continuing.")
        return
      }

      setStatus("Opening secure sign-in...")
      setPendingProvider(provider)

      const supabase = createBrowserClient()
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirectTo", redirectTo)
      const queryParams =
        provider === "google"
          ? {
              prompt: "consent select_account"
            }
          : undefined

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          queryParams,
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true
        }
      })

      if (error) {
        setStatus(`Failed: ${error.message}`)
        setPendingProvider(null)
        return
      }

      if (!data.url) {
        setStatus("Failed: sign-in URL was not returned. Please try again.")
        setPendingProvider(null)
        return
      }

      setStatus("Redirecting to identity provider...")
      window.location.assign(data.url)
    } catch (error: unknown) {
      setStatus(`Failed: ${getErrorMessage(error)}`)
      setPendingProvider(null)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="auth-intro-title">
        <div>
          <p className="eyebrow">AutoTime - Borderless Apply</p>
          <h1 id="auth-intro-title">
            Your EU job search,<br />
            without the guesswork.
          </h1>
          <p>
            Know your fit before you apply. Transparent gap scoring, risk flags,
            and next actions, built for cross-border European tech candidates.
            You review everything. Nothing submits without you.
          </p>
        </div>

        <div className="auth-proof-grid" aria-label="Product strengths">
          <div>
            <strong>EU cross-border</strong>
            <span>
              Country fit, visa risk, and market context. No US-only
              assumptions.
            </span>
          </div>
          <div>
            <strong>No auto-submit</strong>
            <span>
              You approve every application. No bots, no hidden steps, no spam
              risk.
            </span>
          </div>
          <div>
            <strong>Transparent scoring</strong>
            <span>
              Gaps, risks, and next actions shown clearly before you commit
              effort.
            </span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Sign in</p>
          <h2>Open your dashboard</h2>
          <p>
            Track roles, check fit, generate interview prep packs, all in one
            workspace built for the EU market.
          </p>
        </div>

        <div className="header-actions">
          <button
            disabled={Boolean(pendingProvider) || !accountConsent}
            type="button"
            onClick={() => handleSignIn("github")}
          >
            {pendingProvider === "github"
              ? "Opening GitHub..."
              : "Sign in with GitHub"}
          </button>
          <button
            className="secondary-button"
            disabled={Boolean(pendingProvider) || !accountConsent}
            type="button"
            onClick={() => handleSignIn("google")}
          >
            {pendingProvider === "google"
              ? "Opening Google..."
              : "Sign in with Google"}
          </button>
        </div>

        <label className="auth-consent-control">
          <input
            checked={accountConsent}
            type="checkbox"
            onChange={(event) => setAccountConsent(event.target.checked)}
          />
          <span>
            I allow AutoTime to use this sign-in account for my dashboard,
            profile sync and billing access.
          </span>
        </label>

        {status ? <p className="status-banner">{status}</p> : null}

        <p className="auth-privacy-note">
          EU-hosted analytics only - no email used for tracking - your data is
          never sold or shared.
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
