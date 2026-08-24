"use client"

// Client-side sign-in form used by the /admin/login page. Starts the same
// Google OAuth flow as the regular sign-in, but points the callback's
// `redirectTo` at /admin so admin-permission enforcement happens back in
// /auth/callback (which itself redirects to /admin/login?adminDenied=1 if
// the signed-in user isn't an admin). Also offers a "Reset admin session"
// sign-out action for clearing a session that was denied admin access.
import { Suspense, useState } from "react"
import { getCanonicalAppUrl } from "../../../lib/env"
import { createBrowserClient } from "../../../lib/supabase/client"

function getErrorMessage(error: unknown): string {
  return "Admin access only."
}

function AdminLoginForm({ initialStatus }: { initialStatus: string | null }) {
  const [status, setStatus] = useState<string | null>(initialStatus)

  const handleSignIn = async () => {
    try {
      setStatus(null)

      const supabase = createBrowserClient()
      const callbackUrl = new URL("/auth/callback", getCanonicalAppUrl())
      callbackUrl.searchParams.set("redirectTo", "/admin")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          queryParams: {
            prompt: "consent select_account",
          },
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setStatus("Admin access only.")
      }
    } catch (error: unknown) {
      setStatus(getErrorMessage(error))
    }
  }

  const signOut = async () => {
    try {
      setStatus(null)
      const response = await fetch("/auth/signout", { method: "POST" })
      const supabase = createBrowserClient()

      if (response.ok) {
        await supabase.auth.signOut({ scope: "local" })
      } else {
        await supabase.auth.signOut()
      }

      window.location.replace("/admin/login")
    } catch (error: unknown) {
      setStatus("Admin access only.")
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <div className="admin-login-copy">
          <p className="eyebrow">Internal admin</p>
          <h1>EU Apply control room access</h1>
          <p>
            Use your existing EU Apply account. Admin permission is checked
            independently on the server.
          </p>
        </div>

        <div className="admin-login-card">
          <div>
            <span className="admin-live-pill">Protected</span>
            <h2>EU Apply account</h2>
            <p>
              Continue with the same Google account you use for EU Apply.
            </p>
          </div>

          <div className="admin-login-actions">
            <button type="button" onClick={handleSignIn}>
              Continue with Google
            </button>
          </div>

          {status ? (
            <div className="admin-alert-panel warning">
              <strong>Admin access check</strong>
              <p>{status}</p>
              <button
                className="secondary-button"
                type="button"
                onClick={signOut}
              >
                Reset admin session
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

/**
 * Renders the admin sign-in form inside a Suspense boundary, seeded with an
 * `initialStatus` message (e.g. "Admin access only.") supplied by the
 * server-rendered /admin/login page.
 */
export function AdminLoginContent({
  initialStatus,
}: {
  initialStatus: string | null
}) {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm initialStatus={initialStatus} />
    </Suspense>
  )
}
