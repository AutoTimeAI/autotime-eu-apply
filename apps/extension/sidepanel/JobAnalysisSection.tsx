import type { Ref } from "react"
import type { JobAnalysisDraft } from "../lib/storage"
import type { JobAnalysisIssue } from "../lib/validation"
import { getJobIssueForField } from "../lib/validation"
import { getStatusClassName } from "./utils"

type JobAnalysisSectionProps = {
  draft: JobAnalysisDraft
  issues: JobAnalysisIssue[]
  onFieldChange: <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => void
  onSave: () => void
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

export function JobAnalysisSection({
  draft,
  issues,
  onFieldChange,
  onSave,
  saveAttempted,
  status,
  statusRef
}: JobAnalysisSectionProps) {
  return (
    <section className="panel-section">
      <h2>Job Analysis</h2>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Job Analysis needs attention</strong>
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
          Job title
          {saveAttempted && getJobIssueForField(issues, "jobTitle") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "jobTitle")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "jobTitle")
            )}
            value={draft.jobTitle}
            onChange={(event) => onFieldChange("jobTitle", event.target.value)}
          />
        </label>

        <label>
          Company
          {saveAttempted && getJobIssueForField(issues, "company") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "company")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "company")
            )}
            value={draft.company}
            onChange={(event) => onFieldChange("company", event.target.value)}
          />
        </label>

        <label>
          Job URL
          {saveAttempted && getJobIssueForField(issues, "jobUrl") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "jobUrl")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "jobUrl")
            )}
            type="url"
            value={draft.jobUrl}
            onChange={(event) => onFieldChange("jobUrl", event.target.value)}
          />
        </label>

        <label>
          Location/country
          {saveAttempted && getJobIssueForField(issues, "location") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "location")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "location")
            )}
            value={draft.location}
            onChange={(event) => onFieldChange("location", event.target.value)}
          />
        </label>

        <label>
          Work mode
          {saveAttempted && getJobIssueForField(issues, "workMode") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "workMode")}
            </span>
          )}
          <select
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "workMode")
            )}
            value={draft.workMode}
            onChange={(event) =>
              onFieldChange(
                "workMode",
                event.target.value as JobAnalysisDraft["workMode"]
              )
            }
          >
            <option value="unknown">Select work mode</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </label>

        <label>
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
          />
        </label>

        <button type="button" onClick={onSave}>
          Save Job Analysis
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
