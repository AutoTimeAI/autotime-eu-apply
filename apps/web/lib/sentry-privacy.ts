import type { ErrorEvent } from "@sentry/nextjs"

const sensitiveKeyPattern =
  /apikey|api.?key|authorization|card|cookie|cv|description|email|jobdescription|password|payment|phone|resume|secret|share.?code|stripe|token|visa/i

export function getSentryEnvironment(): "development" | "production" {
  const appEnvironment =
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.NEXT_PUBLIC_AUTOTIME_ENV ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV

  if (appEnvironment) {
    return appEnvironment === "production" ? "production" : "development"
  }

  if (process.env.NODE_ENV === "production") {
    return "production"
  }

  return "development"
}

export function isSentryProductionEnvironment(): boolean {
  return getSentryEnvironment() === "production"
}

function redactSensitiveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue)
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[Filtered]" : redactSensitiveValue(entry)
    ])
  )
}

export function filterSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request.cookies = undefined
    event.request.headers = redactSensitiveValue(event.request.headers) as
      | Record<string, string>
      | undefined
    event.request.data = redactSensitiveValue(event.request.data)
    event.request.query_string = redactSensitiveValue(event.request.query_string) as
      | string
      | Record<string, string>
      | undefined
  }

  event.extra = redactSensitiveValue(event.extra) as ErrorEvent["extra"]
  event.contexts = redactSensitiveValue(event.contexts) as ErrorEvent["contexts"]
  event.tags = redactSensitiveValue(event.tags) as ErrorEvent["tags"]
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    data: redactSensitiveValue(breadcrumb.data) as
      | Record<string, unknown>
      | undefined
  }))

  return event
}
