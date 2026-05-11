"use client"

import { Suspense, useState } from "react"
import { publicEnv } from "../../../lib/env"
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
      const callbackUrl = new URL(
        "/auth/callback",
        publicEnv.NEXT_PUBLIC_APP_URL
      )
      callbackUrl.searchParams.set("redirectTo", "/admin")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString()
        }
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
          <h1>AutoTime control room access</h1>
          <p>
            Admin sign-in is separated from the user workspace. Access is
            restricted to admin access only.
          </p>
        </div>

        <div className="admin-login-card">
          <div>
            <span className="admin-live-pill">Protected</span>
            <h2>Admin credentials</h2>
            <p>
              Continue with Google for admin access.
            </p>
          </div>

          <div className="admin-login-actions">
            <button
              type="button"
              onClick={handleSignIn}
            >
              Continue with Google
            </button>
          </div>

          {status ? (
            <div className="admin-alert-panel warning">
              <strong>Admin access check</strong>
              <p>{status}</p>
              <button className="secondary-button" type="button" onClick={signOut}>
                Reset admin session
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export function AdminLoginContent({
  initialStatus
}: {
  initialStatus: string | null
}) {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm initialStatus={initialStatus} />
    </Suspense>
  )
}
