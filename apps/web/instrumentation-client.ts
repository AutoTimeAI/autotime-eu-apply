import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
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
  tracesSampleRate:
    process.env.NODE_ENV === "production" ? 0.1 : 0.2
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
