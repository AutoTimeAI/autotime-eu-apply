import type { Ref } from "react"
import type { ApplicationContentDraft } from "../lib/storage"
import type { ApplicationContentIssue } from "../lib/validation"
import { getApplicationContentIssueForField } from "../lib/validation"
import { getStatusClassName } from "./utils"

type ApplicationContentSectionProps = {
  draft: ApplicationContentDraft
  issues: ApplicationContentIssue[]
  onFieldChange: <K extends keyof ApplicationContentDraft>(
    key: K,
    value: ApplicationContentDraft[K]
  ) => void
  onGenerate: () => void
  onInsertCurrentPage: () => void
  onSave: () => void
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

export function ApplicationContentSection({
  draft,
  issues,
  onFieldChange,
  onGenerate,
  onInsertCurrentPage,
  onSave,
  saveAttempted,
  status,
  statusRef
}: ApplicationContentSectionProps) {
  const strengthsIssue = getApplicationContentIssueForField(
    issues,
    "strengthsAnswer"
  )
  const availabilityIssue = getApplicationContentIssueForField(
    issues,
    "availabilityAnswer"
  )

  return (
    <section className="panel-section">
      <h2>Application Content</h2>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Application Content needs attention</strong>
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
          Cover letter
          {saveAttempted &&
            getApplicationContentIssueForField(issues, "coverLetter") && (
              <span className="field-alert">
                {getApplicationContentIssueForField(issues, "coverLetter")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getApplicationContentIssueForField(issues, "coverLetter")
            )}
            value={draft.coverLetter}
            onChange={(event) =>
              onFieldChange("coverLetter", event.target.value)
            }
          />
        </label>

        <label>
          Profile summary
          {saveAttempted &&
            getApplicationContentIssueForField(issues, "profileSummary") && (
              <span className="field-alert">
                {getApplicationContentIssueForField(issues, "profileSummary")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getApplicationContentIssueForField(issues, "profileSummary")
            )}
            value={draft.profileSummary}
            onChange={(event) =>
              onFieldChange("profileSummary", event.target.value)
            }
          />
        </label>

        <label>
          Motivation answer
          {saveAttempted &&
            getApplicationContentIssueForField(issues, "motivationAnswer") && (
              <span className="field-alert">
                {getApplicationContentIssueForField(issues, "motivationAnswer")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getApplicationContentIssueForField(issues, "motivationAnswer")
            )}
            value={draft.motivationAnswer}
            onChange={(event) =>
              onFieldChange("motivationAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Strengths answer
          {saveAttempted && strengthsIssue && (
            <span className="field-alert">{strengthsIssue}</span>
          )}
          <textarea
            aria-invalid={Boolean(saveAttempted && strengthsIssue)}
            value={draft.strengthsAnswer}
            onChange={(event) =>
              onFieldChange("strengthsAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Availability answer
          {saveAttempted && availabilityIssue && (
            <span className="field-alert">{availabilityIssue}</span>
          )}
          <textarea
            aria-invalid={Boolean(saveAttempted && availabilityIssue)}
            value={draft.availabilityAnswer}
            onChange={(event) =>
              onFieldChange("availabilityAnswer", event.target.value)
            }
          />
        </label>

        <button type="button" onClick={onSave}>
          Save Application Content
        </button>

        <button type="button" onClick={onGenerate}>
          Generate from Saved Data
        </button>

        <button type="button" onClick={onInsertCurrentPage}>
          Insert Saved Content
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
