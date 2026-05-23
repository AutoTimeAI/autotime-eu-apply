import * as Sentry from "@sentry/nextjs"
import {
  filterSentryEvent,
  getSentryEnvironment,
  isSentryProductionEnvironment
} from "./lib/sentry-privacy"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  beforeSend: filterSentryEvent,
  dsn,
  enabled: Boolean(dsn),
  environment: getSentryEnvironment(),
  integrations: [
    Sentry.replayIntegration({
      blockAllMedia: true,
      maskAllInputs: true,
      maskAllText: true
    })
  ],
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  tracesSampleRate: isSentryProductionEnvironment() ? 0.1 : 0.2
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
