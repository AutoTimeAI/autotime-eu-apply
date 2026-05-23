import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"
import { isSentryProductionEnvironment } from "../../../lib/sentry-privacy"

export function GET() {
  const enabledInProduction =
    process.env.SENTRY_TEST_API_ENABLED === "true"

  if (isSentryProductionEnvironment() && !enabledInProduction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  Sentry.addBreadcrumb({
    category: "sentry.test",
    data: {
      action: "server_test_error",
      route: "/api/sentry-test",
      status: "started",
      timestamp: new Date().toISOString()
    },
    level: "info",
    message: "sentry_server_test_started"
  })

  const eventId = Sentry.captureException(
    new Error("Sentry MVP server verification error")
  )

  return NextResponse.json({
    eventId,
    ok: true
  })
}
