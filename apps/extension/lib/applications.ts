import type { ApplicationRecord, ApplicationStatus } from "./storage"

export type ApplicationStatusFilter = "all" | ApplicationStatus

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
