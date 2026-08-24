"use client"

// Next.js App Router global error boundary. This only fires when the root
// layout itself fails to render, so unlike error.tsx it must render its own
// complete <html>/<body> (the normal layout is not available). Reports the
// failure to Sentry and to AutoTime's client-diagnostics endpoint, then
// offers a "Try again" reset or a link to sign in again. Client component
// (error boundaries must run on the client).
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import {
  getClientErrorMessage,
  reportClientIssue
} from "../lib/client-diagnostics"

/**
 * Root-level error boundary rendered when the application shell (root
 * layout) itself throws. Logs the error to Sentry and to the
 * client-diagnostics reporter (tagged area "dashboard") on mount, then
 * renders a standalone recovery page with a `reset()` retry button and a
 * link to /login.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = getClientErrorMessage(error, "Application shell failed")

  useEffect(() => {
    Sentry.captureException(error)
    reportClientIssue({
      area: "dashboard",
      code: "app.global.error-boundary",
      message,
      metadata: {
        digest: error.digest ?? null
      }
    })
  }, [error.digest, message])

  return (
    <html lang="en">
      <body>
        <main className="error-shell" role="alert">
          <p className="eyebrow">Fallback active</p>
          <h1>AutoTime needs a refresh</h1>
          <p>
            The application shell hit a failure. The issue was recorded, and the
            workflow has been stopped safely.
          </p>
          <div className="error-actions">
            <button type="button" onClick={reset}>
              Try again
            </button>
            <a className="secondary-link" href="/login">
              Sign in again
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
