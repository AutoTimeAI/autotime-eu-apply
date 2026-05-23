import * as Sentry from "@sentry/nextjs"
import { isSentryProductionEnvironment } from "./sentry-privacy"

type SafeBreadcrumbData = Record<string, string | number | boolean | null>
type BreadcrumbMessage =
  | "application_kit_generated"
  | "eu_fit_checked"
  | "job_import_started"
  | "waitlist_submitted"

function addSafeBreadcrumb({
  category,
  data,
  message
}: {
  category: "application_kit" | "fit" | "job" | "waitlist"
  data?: SafeBreadcrumbData
  message: string
}) {
  Sentry.addBreadcrumb({
    category,
    data: {
      ...sanitizeBreadcrumbData(data),
      action: message,
      timestamp: new Date().toISOString()
    },
    level: "info",
    message
  })
}

function captureDevelopmentVerificationMessage(message: BreadcrumbMessage) {
  if (isSentryProductionEnvironment()) {
    return
  }

  Sentry.captureMessage(`TEST: ${message}`)
}

const sensitiveBreadcrumbKeyPattern =
  /apikey|api.?key|card|cookie|cv|description|email|jobdescription|password|payment|phone|resume|secret|share.?code|token|visa/i

function sanitizeBreadcrumbData(data?: SafeBreadcrumbData): SafeBreadcrumbData {
  if (!data) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !sensitiveBreadcrumbKeyPattern.test(key)
    )
  ) as SafeBreadcrumbData
}

export function trackJobImportStarted(data?: SafeBreadcrumbData) {
  addSafeBreadcrumb({
    category: "job",
    data,
    message: "job_import_started"
  })
  captureDevelopmentVerificationMessage("job_import_started")
}

export function trackEUFitChecked(data?: SafeBreadcrumbData) {
  addSafeBreadcrumb({
    category: "fit",
    data,
    message: "eu_fit_checked"
  })
  captureDevelopmentVerificationMessage("eu_fit_checked")
}

export function trackApplicationKitGenerated(data?: SafeBreadcrumbData) {
  addSafeBreadcrumb({
    category: "application_kit",
    data,
    message: "application_kit_generated"
  })
  captureDevelopmentVerificationMessage("application_kit_generated")
}

export function trackWaitlistSubmitted(data?: SafeBreadcrumbData) {
  addSafeBreadcrumb({
    category: "waitlist",
    data,
    message: "waitlist_submitted"
  })
  captureDevelopmentVerificationMessage("waitlist_submitted")
}
