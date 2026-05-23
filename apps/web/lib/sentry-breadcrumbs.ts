import * as Sentry from "@sentry/nextjs"

type MvpBreadcrumbName =
  | "application_kit_generated"
  | "eu_fit_checked"
  | "job_import_started"
  | "waitlist_submitted"

export function addMvpBreadcrumb(
  name: MvpBreadcrumbName,
  data?: Record<string, string | number | boolean | null>
) {
  Sentry.addBreadcrumb({
    category: "mvp.action",
    data,
    level: "info",
    message: name
  })
}
