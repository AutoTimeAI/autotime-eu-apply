"use client"

import * as Sentry from "@sentry/nextjs"

export default function SentryTestPage() {
  return (
    <main className="dashboard-shell">
      <section className="market-context-panel">
        <div className="section-heading">
          <p className="eyebrow">Development verification</p>
          <h1>Sentry test page</h1>
          <p>
            This unlinked page sends a client-side test error to Sentry. Remove
            it after production monitoring is verified.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            Sentry.addBreadcrumb({
              category: "sentry.test",
              level: "info",
              message: "sentry_test_button_clicked"
            })
            throw new Error("Sentry MVP verification error")
          }}
        >
          Throw Sentry test error
        </button>
      </section>
    </main>
  )
}
