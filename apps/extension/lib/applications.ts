// Pure helpers for working with the list of saved ApplicationRecord objects
// (lib/storage.ts) - URL normalization/dedup for matching a page to an
// existing tracked application, search/status filtering for the side
// panel's Applications list, dashboard-merge logic used before a sync
// write, and CSV export (with formula-injection sanitization) for both
// applications and validation-metrics exports. No chrome.* APIs here, so
// this is safe to import from both content scripts and the side panel.
import type { ApplicationRecord, ApplicationStatus } from "./storage"

export type ApplicationStatusFilter = "all" | ApplicationStatus

export type ApplicationValidationMetrics = {
  totalApplications: number
  applicationsWithContentSnapshots: number
  applicationsWithNextActions: number
  applicationsWithOutcomeNotes: number
  contentSnapshotCoveragePercent: number
  nextActionCoveragePercent: number
  outcomeNoteCoveragePercent: number
  statusCounts: Record<ApplicationStatus, number>
  sourceCounts: Array<{ source: string; count: number }>
}

/**
 * Normalizes a job URL into a stable dedup key: strips the hash, lowercases
 * the hostname, drops a trailing slash from the path, and lowercases the
 * whole result. Falls back to a lowercased/trimmed string if `url` doesn't
 * parse. Used to detect "is this job already tracked?" across the widget,
 * side panel, and dashboard merge, so equivalent URLs (different case,
 * trailing slash, or fragment) collapse to the same application.
 */
export function normalizeApplicationUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    parsed.pathname = parsed.pathname.replace(/\/+$/, "")
    return parsed.toString().replace(/\/$/, "").toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}

/**
 * Filters `applications` by status (or "all") and a free-text query matched
 * case-insensitively against role title, title, company, source, URL, next
 * action, next action date, and notes. Used to back the Applications
 * section's search box and status dropdown.
 */
export function filterApplications(
  applications: ApplicationRecord[],
  query: string,
  statusFilter: ApplicationStatusFilter
) {
  const normalizedQuery = query.trim().toLowerCase()

  return applications.filter((application) => {
    const matchesStatus =
      statusFilter === "all" || application.status === statusFilter

    if (!matchesStatus) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return [
      application.roleTitle,
      application.title,
      application.company,
      application.source,
      application.url,
      application.nextAction,
      application.nextActionDate,
      application.notes
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  })
}

/** True if any application's normalized URL matches `url`'s normalized form. */
export function hasApplicationWithUrl(
  applications: ApplicationRecord[],
  url: string
) {
  const normalizedUrl = normalizeApplicationUrl(url)
  return applications.some(
    (application) => normalizeApplicationUrl(application.url) === normalizedUrl
  )
}

/**
 * Merges a local applications list with the dashboard's copy, keyed by
 * normalized URL (falling back to id if the URL is blank). Wherever both
 * sides have an entry for the same key, the dashboard's version wins (it is
 * the source of truth once synced); local-only entries are kept as-is.
 * Used before every sync write in lib/cloud-sync.ts so a sync never
 * silently drops edits made from the web dashboard.
 */
export function mergeDashboardApplications(
  localApplications: ApplicationRecord[],
  dashboardApplications: ApplicationRecord[]
) {
  const dashboardByUrl = new Map(
    dashboardApplications.map((application) => [
      normalizeApplicationUrl(application.url || application.id),
      application
    ])
  )
  const seen = new Set<string>()

  return [
    ...localApplications.map((application) => {
      const key = normalizeApplicationUrl(application.url || application.id)
      return dashboardByUrl.get(key) ?? application
    }),
    ...dashboardApplications
  ].filter((application) => {
    const key = normalizeApplicationUrl(application.url || application.id)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function escapeCsvValue(value: string | undefined) {
  const text = value ?? ""
  const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

/**
 * Serializes applications (including their content snapshot, if any) to
 * CSV text for the "Export CSV" action. Every cell goes through
 * `escapeCsvValue`, which quote-escapes values and prefixes spreadsheet
 * formula-like content because fields may originate from untrusted pages.
 */
export function applicationsToCsv(applications: ApplicationRecord[]) {
  const headers = [
    "Title",
    "Role Title",
    "Company",
    "URL",
    "Source",
    "Created At",
    "Status",
    "Next Action",
    "Next Action Date",
    "Notes",
    "Content Snapshot Saved At",
    "Snapshot Cover Letter",
    "Snapshot Profile Summary",
    "Snapshot Motivation Answer",
    "Snapshot Strengths Answer",
    "Snapshot Availability Answer"
  ]

  const rows = applications.map((application) => [
    application.title,
    application.roleTitle,
    application.company,
    application.url,
    application.source,
    application.createdAt,
    application.status,
    application.nextAction,
    application.nextActionDate,
    application.notes,
    application.contentSnapshot?.savedAt,
    application.contentSnapshot?.coverLetter,
    application.contentSnapshot?.profileSummary,
    application.contentSnapshot?.motivationAnswer,
    application.contentSnapshot?.strengthsAnswer,
    application.contentSnapshot?.availabilityAnswer
  ])

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n")
}

/**
 * Serializes an ApplicationValidationMetrics summary to CSV as three
 * blank-line-separated sections (summary, status counts, source counts),
 * for the Validation Metrics section's export button. Same CSV-cell
 * sanitization as `applicationsToCsv`.
 */
export function validationMetricsToCsv(metrics: ApplicationValidationMetrics) {
  const summaryRows = [
    ["Metric", "Value"],
    ["Total applications tracked", String(metrics.totalApplications)],
    [
      "Applications with content snapshots",
      String(metrics.applicationsWithContentSnapshots)
    ],
    [
      "Content snapshot coverage percent",
      String(metrics.contentSnapshotCoveragePercent)
    ],
    ["Applications with next actions", String(metrics.applicationsWithNextActions)],
    ["Next action coverage percent", String(metrics.nextActionCoveragePercent)],
    [
      "Applied/interview/closed applications with notes",
      String(metrics.applicationsWithOutcomeNotes)
    ],
    ["Outcome note coverage percent", String(metrics.outcomeNoteCoveragePercent)]
  ]

  const statusRows = [
    ["Status", "Count"],
    ...Object.entries(metrics.statusCounts).map(([status, count]) => [
      status,
      String(count)
    ])
  ]

  const sourceRows = [
    ["Source", "Count"],
    ...metrics.sourceCounts.map((sourceCount) => [
      sourceCount.source,
      String(sourceCount.count)
    ])
  ]

  return [summaryRows, statusRows, sourceRows]
    .map((sectionRows) =>
      sectionRows
        .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
        .join("\n")
    )
    .join("\n\n")
}

/**
 * Computes coverage metrics over the saved applications list: how many have
 * a content snapshot, a next action, or an outcome note (for
 * applied/interview/offer/rejected/archived statuses), plus counts by
 * status and by source. Backs the Validation Metrics section, used to spot
 * gaps in how thoroughly applications are being tracked.
 */
export function getApplicationValidationMetrics(
  applications: ApplicationRecord[]
): ApplicationValidationMetrics {
  const statusCounts: Record<ApplicationStatus, number> = {
    Saved: 0,
    "Checking fit": 0,
    "Ready to apply": 0,
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Archived: 0
  }
  const sourceCounts = new Map<string, number>()
  let applicationsWithContentSnapshots = 0
  let applicationsWithNextActions = 0
  let applicationsWithOutcomeNotes = 0

  for (const application of applications) {
    statusCounts[application.status] += 1

    if (application.contentSnapshot) {
      applicationsWithContentSnapshots += 1
    }

    if (application.nextAction || application.nextActionDate) {
      applicationsWithNextActions += 1
    }

    if (
      ["Applied", "Interview", "Offer", "Rejected", "Archived"].includes(
        application.status
      ) &&
      application.notes?.trim()
    ) {
      applicationsWithOutcomeNotes += 1
    }

    const source = application.source || "Unknown"
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1)
  }

  const getCoveragePercent = (count: number) =>
    applications.length === 0
      ? 0
      : Math.round((count / applications.length) * 100)

  return {
    totalApplications: applications.length,
    applicationsWithContentSnapshots,
    applicationsWithNextActions,
    applicationsWithOutcomeNotes,
    contentSnapshotCoveragePercent: getCoveragePercent(
      applicationsWithContentSnapshots
    ),
    nextActionCoveragePercent: getCoveragePercent(applicationsWithNextActions),
    outcomeNoteCoveragePercent: getCoveragePercent(applicationsWithOutcomeNotes),
    statusCounts,
    sourceCounts: Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((first, second) => second.count - first.count)
  }
}
