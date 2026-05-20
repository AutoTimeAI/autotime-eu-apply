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

function normalizeApplicationUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}

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

export function hasApplicationWithUrl(
  applications: ApplicationRecord[],
  url: string
) {
  const normalizedUrl = normalizeApplicationUrl(url)
  return applications.some(
    (application) => normalizeApplicationUrl(application.url) === normalizedUrl
  )
}

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
  return `"${text.replace(/"/g, '""')}"`
}

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
