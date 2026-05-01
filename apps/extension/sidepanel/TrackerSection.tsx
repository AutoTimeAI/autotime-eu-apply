import type { Ref } from "react"
import type { ApplicationStatus, TrackerDraft } from "../lib/storage"
import type { TrackerIssue } from "../lib/validation"
import { getTrackerIssueForField } from "../lib/validation"
import { applicationStatuses } from "./constants"
import { getStatusClassName } from "./utils"

type TrackerSectionProps = {
  draft: TrackerDraft
  issues: TrackerIssue[]
  onFieldChange: <K extends keyof TrackerDraft>(
    key: K,
    value: TrackerDraft[K]
  ) => void
  onImportCurrentJobPage: () => void
  onSave: () => void
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

export function TrackerSection({
  draft,
  issues,
  onFieldChange,
  onImportCurrentJobPage,
  onSave,
  saveAttempted,
  status,
  statusRef
}: TrackerSectionProps) {
  return (
    <section className="panel-section">
      <h2>Tracker</h2>

      <div className="form-grid">
        <button type="button" onClick={onImportCurrentJobPage}>
          Import Current Job Page
        </button>

        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Tracker needs attention</strong>
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label>
          Role title
          {saveAttempted && getTrackerIssueForField(issues, "roleTitle") && (
            <span className="field-alert">
              {getTrackerIssueForField(issues, "roleTitle")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getTrackerIssueForField(issues, "roleTitle")
            )}
            value={draft.roleTitle}
            onChange={(event) => onFieldChange("roleTitle", event.target.value)}
          />
        </label>

        <label>
          Company
          {saveAttempted && getTrackerIssueForField(issues, "company") && (
            <span className="field-alert">
              {getTrackerIssueForField(issues, "company")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getTrackerIssueForField(issues, "company")
            )}
            value={draft.company}
            onChange={(event) => onFieldChange("company", event.target.value)}
          />
        </label>

        <label>
          Application URL
          {saveAttempted &&
            getTrackerIssueForField(issues, "applicationUrl") && (
              <span className="field-alert">
                {getTrackerIssueForField(issues, "applicationUrl")}
              </span>
            )}
          <input
            aria-invalid={Boolean(
              saveAttempted &&
                getTrackerIssueForField(issues, "applicationUrl")
            )}
            type="url"
            value={draft.applicationUrl}
            onChange={(event) =>
              onFieldChange("applicationUrl", event.target.value)
            }
          />
        </label>

        <label>
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              onFieldChange("status", event.target.value as ApplicationStatus)
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
          {saveAttempted && getTrackerIssueForField(issues, "nextAction") && (
            <span className="field-alert">
              {getTrackerIssueForField(issues, "nextAction")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getTrackerIssueForField(issues, "nextAction")
            )}
            value={draft.nextAction}
            onChange={(event) =>
              onFieldChange("nextAction", event.target.value)
            }
          />
        </label>

        <label>
          Next action date
          {saveAttempted &&
            getTrackerIssueForField(issues, "nextActionDate") && (
              <span className="field-alert">
                {getTrackerIssueForField(issues, "nextActionDate")}
              </span>
            )}
          <input
            aria-invalid={Boolean(
              saveAttempted &&
                getTrackerIssueForField(issues, "nextActionDate")
            )}
            type="date"
            value={draft.nextActionDate}
            onChange={(event) =>
              onFieldChange("nextActionDate", event.target.value)
            }
          />
        </label>

        <label>
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
          />
        </label>

        <button type="button" onClick={onSave}>
          Save Tracker
        </button>

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
      </div>
    </section>
  )
}
