"use client"

import { useEffect } from "react"
import {
  getClientErrorMessage,
  reportClientIssue
} from "../lib/client-diagnostics"

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const message = getClientErrorMessage(error, "Application shell failed")

  useEffect(() => {
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
