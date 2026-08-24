"use client"

// Client-only button panel for /sentry-test: lets a developer manually
// trigger a thrown error, a captured test message, or a breadcrumb-then-
// error, to confirm Sentry is receiving client-side events. Never rendered
// in production (the parent page 404s there first).
import * as Sentry from "@sentry/nextjs"

/**
 * Renders three buttons that each exercise a different Sentry capture path:
 * an uncaught thrown error, a `Sentry.captureMessage` call (skipped when
 * `NODE_ENV === "production"` as a belt-and-braces check on top of the
 * parent page's own production guard), and a breadcrumb recorded just
 * before throwing an error.
 */
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
