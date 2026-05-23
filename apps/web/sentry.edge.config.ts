import * as Sentry from "@sentry/nextjs"
import {
  filterSentryEvent,
  getSentryEnvironment,
  isSentryProductionEnvironment
} from "./lib/sentry-privacy"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  beforeSend: filterSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  environment: getSentryEnvironment(),
  sendDefaultPii: false,
  tracesSampleRate: isSentryProductionEnvironment() ? 0.1 : 0.2
})
