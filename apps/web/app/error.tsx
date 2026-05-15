"use client"

import { useEffect } from "react"
import {
  getClientErrorMessage,
  reportClientIssue
} from "../lib/client-diagnostics"

export default function ErrorFallback({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = getClientErrorMessage(error, "Dashboard view failed")

  useEffect(() => {
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
