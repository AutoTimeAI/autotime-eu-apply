import type { ApplicationRecord, ApplicationStatus } from "./storage"

export type ApplicationStatusFilter = "all" | ApplicationStatus

export type ApplicationValidationMetrics = {
  totalApplications: number
  applicationsWithContentSnapshots: number
  applicationsWithNextActions: number
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

export function getApplicationValidationMetrics(
  applications: ApplicationRecord[]
): ApplicationValidationMetrics {
  const statusCounts: Record<ApplicationStatus, number> = {
    Saved: 0,
    Applying: 0,
    Applied: 0,
    Interview: 0,
    Rejected: 0,
    Closed: 0
  }
  const sourceCounts = new Map<string, number>()
  let applicationsWithContentSnapshots = 0
  let applicationsWithNextActions = 0

  for (const application of applications) {
    statusCounts[application.status] += 1

    if (application.contentSnapshot) {
      applicationsWithContentSnapshots += 1
    }

    if (application.nextAction || application.nextActionDate) {
      applicationsWithNextActions += 1
    }

    const source = application.source || "Unknown"
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1)
  }

  return {
    totalApplications: applications.length,
    applicationsWithContentSnapshots,
    applicationsWithNextActions,
    statusCounts,
    sourceCounts: Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((first, second) => second.count - first.count)
  }
}
