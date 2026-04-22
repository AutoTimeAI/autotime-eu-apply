import type { ApplicationRecord, ApplicationStatus } from "./storage"

export type ApplicationStatusFilter = "all" | ApplicationStatus

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
    "Notes"
  ]

  const rows = applications.map((application) => [
    application.title,
    application.roleTitle,
    application.company,
    application.url,
    application.source,
    application.createdAt,
    application.status,
    application.notes
  ])

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n")
}
