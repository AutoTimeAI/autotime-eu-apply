// /sentry-test page: an unlinked, non-production-only debug page for
// manually verifying that Sentry error/message/breadcrumb capture is wired
// up correctly. Returns a 404 (via notFound()) whenever
// isSentryProductionEnvironment() is true, so it never exists in
// production. Server component that renders the interactive
// SentryTestClient.
import { notFound } from "next/navigation"
import { SentryTestClient } from "./SentryTestClient"
import { isSentryProductionEnvironment } from "../../lib/sentry-privacy"

/**
 * Renders the Sentry verification page, or a 404 if the current environment
 * is considered production (per `isSentryProductionEnvironment`).
 */
export default function SentryTestPage() {
  if (isSentryProductionEnvironment()) {
    notFound()
  }

  return (
    <main className="dashboard-shell">
      <SentryTestClient />
    </main>
  )
}
