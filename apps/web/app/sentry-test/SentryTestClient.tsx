"use client"

import * as Sentry from "@sentry/nextjs"

export function SentryTestClient() {
  const captureTestMessage = () => {
    if (process.env.NODE_ENV === "production") {
      return
    }

    Sentry.captureMessage("TEST: sentry_client_message")
  }

  const throwTestError = () => {
    throw new Error("Sentry MVP verification error")
  }

  const throwBreadcrumbTestError = () => {
    Sentry.addBreadcrumb({
      category: "sentry.test",
      data: {
        action: "breadcrumb_error_test",
        route: "/sentry-test",
        status: "started",
        timestamp: new Date().toISOString()
      },
      level: "info",
      message: "sentry_test_breadcrumb_added"
    })

    throw new Error("Sentry MVP breadcrumb verification error")
  }

  return (
    <section className="market-context-panel">
      <div className="section-heading">
        <p className="eyebrow">Development verification</p>
        <h1>Sentry test page</h1>
        <p>
          This unlinked page verifies client-side Sentry errors, test messages
          and breadcrumbs without collecting user input.
        </p>
      </div>
      <div className="application-actions">
        <button type="button" onClick={throwTestError}>
          Throw Sentry test error
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={captureTestMessage}
        >
          Capture non-production test message
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={throwBreadcrumbTestError}
        >
          Test breadcrumb plus error
        </button>
      </div>
    </section>
  )
}
