import type { ErrorEvent } from "@sentry/nextjs"

const sensitiveKeyPattern =
  /apikey|api.?key|authorization|card|cookie|cv|description|email|jobdescription|password|payment|phone|resume|secret|share.?code|stripe|token|visa/i

// Matches key=value pairs (query-string style, whether or not the
// surrounding text is a well-formed URL) whose key looks sensitive, so a
// secret-bearing URL embedded in free text - a breadcrumb message, an
// event.request.url, a nested "url" field inside breadcrumb data - gets
// its value scrubbed even though the field carrying that string isn't
// itself named "secret" or "token" (e.g. request.url, breadcrumb.message).
function redactSensitiveUrlText(value: string): string {
  return value.replace(
    /([?&]?)([a-zA-Z0-9_.-]+)=([^&\s"']*)/g,
    (match, separator: string, key: string, urlValue: string) =>
      urlValue && sensitiveKeyPattern.test(key)
        ? `${separator}${key}=%5BFiltered%5D`
        : match
  )
}

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

  if (typeof value === "string") {
    return redactSensitiveUrlText(value)
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
    if (typeof event.request.url === "string") {
      event.request.url = redactSensitiveUrlText(event.request.url)
    }
  }

  event.extra = redactSensitiveValue(event.extra) as ErrorEvent["extra"]
  event.contexts = redactSensitiveValue(event.contexts) as ErrorEvent["contexts"]
  event.tags = redactSensitiveValue(event.tags) as ErrorEvent["tags"]
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    data: redactSensitiveValue(breadcrumb.data) as
      | Record<string, unknown>
      | undefined,
    message:
      typeof breadcrumb.message === "string"
        ? redactSensitiveUrlText(breadcrumb.message)
        : breadcrumb.message
  }))

  return event
}
