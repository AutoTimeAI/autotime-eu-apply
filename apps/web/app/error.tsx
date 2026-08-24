"use client"

// Next.js App Router error boundary for the app/ route segment. When a
// rendering error is thrown anywhere under this segment (short of a root
// layout failure, which global-error.tsx handles instead), Next.js swaps
// the failed subtree for this fallback UI. Reports the error to Sentry and
// to AutoTime's own client-diagnostics endpoint, then offers the user a
// "Try again" reset or an escape hatch back to the dashboard. Client
// component (error boundaries must run on the client).
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import {
  getClientErrorMessage,
  reportClientIssue
} from "../lib/client-diagnostics"

/**
 * Error boundary fallback rendered when a route segment throws during
 * render. Logs the error to Sentry and to the client-diagnostics reporter
 * (tagged area "dashboard") on mount, then shows a recovery UI with a
 * `reset()` retry button and a link back to /dashboard.
 */
export default function ErrorFallback({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = getClientErrorMessage(error, "Dashboard view failed")

  useEffect(() => {
    Sentry.captureException(error)
    reportClientIssue({
      area: "dashboard",
      code: "app.route.error-boundary",
      message,
      metadata: {
        digest: error.digest ?? null
      }
    })
  }, [error.digest, message])

  return (
    <main className="error-shell" role="alert">
      <p className="eyebrow">Fallback active</p>
      <h1>This view needs a refresh</h1>
      <p>
        AutoTime recorded the issue and kept your workflow from continuing in an
        unsafe state.
      </p>
      <div className="error-actions">
        <button type="button" onClick={reset}>
          Try again
        </button>
        <a className="secondary-link" href="/dashboard">
          Open dashboard
        </a>
      </div>
    </main>
  )
}
