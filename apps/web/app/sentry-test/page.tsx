import { notFound } from "next/navigation"
import { SentryTestClient } from "./SentryTestClient"
import { isSentryProductionEnvironment } from "../../lib/sentry-privacy"

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
