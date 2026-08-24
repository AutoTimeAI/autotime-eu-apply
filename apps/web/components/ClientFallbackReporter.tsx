"use client"

// Global safety-net UI: listens for uncaught window errors and unhandled
// promise rejections anywhere in the dashboard, reports them via
// `reportClientIssue` for diagnostics, and surfaces a small dismissible
// alert so the user knows something failed even if the failing component
// didn't render its own error state. Mounted once near the app root.

import { useEffect, useState } from "react"
import {
  getClientErrorMessage,
  reportClientIssue
} from "../lib/client-diagnostics"

type ClientFallbackAlert = {
  code: string
  message: string
}

/**
 * Registers `window.onerror`/`unhandledrejection` listeners for the
 * lifetime of the component, reports each occurrence via
 * `reportClientIssue`, and renders a single dismissible alert for the most
 * recent one. Renders nothing until an error has actually occurred.
 */
export function ClientFallbackReporter() {
  const [alert, setAlert] = useState<ClientFallbackAlert | null>(null)

  useEffect(() => {
    const reportRuntimeIssue = (
      code: string,
      message: string,
      metadata: Record<string, string | number | boolean | null>
    ) => {
      setAlert({ code, message })
      reportClientIssue({
        area: "dashboard",
        code,
        message,
        metadata
      })
    }

    const handleError = (event: ErrorEvent) => {
      const message =
        event.message || getClientErrorMessage(event.error, "Browser error")
      reportRuntimeIssue("client.runtime.error", message, {
        column: event.colno || null,
        filename: event.filename || null,
        line: event.lineno || null,
        source: "window.error"
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportRuntimeIssue(
        "client.runtime.unhandled-rejection",
        getClientErrorMessage(event.reason, "Unexpected background failure"),
        {
          source: "unhandledrejection"
        }
      )
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [])

  if (!alert) {
    return null
  }

  return (
    <section className="client-fallback-alert" role="alert">
      <div>
        <strong>Something needs attention</strong>
        <p>{alert.message}</p>
        <small>Recorded as {alert.code}</small>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={() => setAlert(null)}
      >
        Dismiss
      </button>
    </section>
  )
}
