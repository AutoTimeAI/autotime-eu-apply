import type { Ref } from "react"
import type { ApplicationStatusFilter } from "../lib/applications"
import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationSyncState
} from "../lib/storage"
import { applicationStatuses } from "./constants"
import { formatCreatedDate, getStatusClassName } from "./utils"

type ApplicationChanges = Partial<
  Pick<
    ApplicationRecord,
    | "company"
    | "nextAction"
    | "nextActionDate"
    | "notes"
    | "roleTitle"
    | "source"
    | "status"
  >
>

type ApplicationsSectionProps = {
  applications: ApplicationRecord[]
  applicationSyncState: Record<string, ApplicationSyncState>
  searchQuery: string
  status: string
  statusFilter: ApplicationStatusFilter
  statusRef: Ref<HTMLParagraphElement>
  visibleApplications: ApplicationRecord[]
  onDeleteApplication: (id: string) => void
  onExportApplications: () => void
  onExportV2Dashboard: () => void
  onSaveCurrentTab: () => void
  onSearchQueryChange: (query: string) => void
  onSyncApplications: () => void
  onStatusFilterChange: (statusFilter: ApplicationStatusFilter) => void
  onUpdateApplication: (id: string, changes: ApplicationChanges) => void
}

export function ApplicationsSection({
  applications,
  applicationSyncState,
  searchQuery,
  status,
  statusFilter,
  statusRef,
  visibleApplications,
  onDeleteApplication,
  onExportApplications,
  onExportV2Dashboard,
  onSaveCurrentTab,
  onSearchQueryChange,
  onSyncApplications,
  onStatusFilterChange,
  onUpdateApplication
}: ApplicationsSectionProps) {
  return (
    <section className="panel-section">
      <h2>Applications</h2>

      <div className="application-actions">
        <button type="button" onClick={onSaveCurrentTab}>
          Save Current Tab
        </button>
        <button type="button" onClick={onSyncApplications}>
          Sync Now
        </button>
        <button type="button" onClick={onExportApplications}>
          Export CSV
        </button>
        <button type="button" onClick={onExportV2Dashboard}>
          Export V2 Dashboard JSON
        </button>
      </div>

      <div className="application-filters">
        <input
          placeholder="Search applications"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as ApplicationStatusFilter)
          }
        >
          <option value="all">all</option>
          {applicationStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {status && (
        <p
          className={getStatusClassName(status)}
          ref={statusRef}
          role="status"
          tabIndex={-1}
        >
          {status}
        </p>
      )}

      {applications.length === 0 ? (
        <p className="empty-state">No saved applications yet.</p>
      ) : visibleApplications.length === 0 ? (
        <p className="empty-state">No applications match your filters.</p>
      ) : (
        <div className="application-list">
          {visibleApplications.map((application) => (
            <article className="application-record" key={application.id}>
              <div>
                {(() => {
                  const syncState = applicationSyncState[application.id]
                  const label =
                    syncState?.status === "synced"
                      ? "Synced"
                      : syncState?.status === "failed"
                        ? "Sync failed"
                        : "Saved locally"

                  return (
                    <span
                      className={`plan-badge ${syncState?.status === "synced" ? "pro" : ""}`}
                      title={syncState?.lastError ?? undefined}
                    >
                      {label}
                    </span>
                  )
                })()}
                <h3>{application.roleTitle || application.title}</h3>
                {application.company && <p>{application.company}</p>}
                <a href={application.url} target="_blank" rel="noreferrer">
                  {application.url}
                </a>
                <p>
                  {formatCreatedDate(application.createdAt)} -{" "}
                  {application.status}
                  {application.source ? ` - ${application.source}` : ""}
                </p>
              </div>

              <label>
                Role title
                <input
                  value={application.roleTitle ?? application.title}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      roleTitle: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Company
                <input
                  placeholder="Company"
                  value={application.company ?? ""}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      company: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Source
                <input
                  placeholder="Source"
                  value={application.source ?? ""}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      source: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Status
                <select
                  value={application.status}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      status: event.target.value as ApplicationStatus
                    })
                  }
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Next action
                <input
                  placeholder="Next action"
                  value={application.nextAction ?? ""}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      nextAction: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Next action date
                <input
                  type="date"
                  value={application.nextActionDate ?? ""}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      nextActionDate: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Notes
                <textarea
                  value={application.notes ?? ""}
                  onChange={(event) =>
                    onUpdateApplication(application.id, {
                      notes: event.target.value
                    })
                  }
                />
              </label>

              {application.contentSnapshot && (
                <dl className="profile-summary">
                  <div>
                    <dt>Content snapshot saved</dt>
                    <dd>
                      {new Date(
                        application.contentSnapshot.savedAt
                      ).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Snapshot cover letter</dt>
                    <dd>{application.contentSnapshot.coverLetter || "None"}</dd>
                  </div>
                  <div>
                    <dt>Snapshot profile summary</dt>
                    <dd>
                      {application.contentSnapshot.profileSummary || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Snapshot motivation answer</dt>
                    <dd>
                      {application.contentSnapshot.motivationAnswer || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Snapshot strengths answer</dt>
                    <dd>
                      {application.contentSnapshot.strengthsAnswer || "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Snapshot availability answer</dt>
                    <dd>
                      {application.contentSnapshot.availabilityAnswer || "None"}
                    </dd>
                  </div>
                </dl>
              )}

              <button
                className="danger-button"
                type="button"
                onClick={() => onDeleteApplication(application.id)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
