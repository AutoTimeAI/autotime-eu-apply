import type { Ref } from "react"
import type { ReusableAnswers } from "../lib/storage"
import type { ReusableAnswerIssue } from "../lib/validation"
import { getReusableAnswerIssueForField } from "../lib/validation"
import { getStatusClassName } from "./utils"

type ReusableAnswersSectionProps = {
  answers: ReusableAnswers
  issues: ReusableAnswerIssue[]
  onFieldChange: <K extends keyof ReusableAnswers>(
    key: K,
    value: ReusableAnswers[K]
  ) => void
  onSave: () => void
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

export function ReusableAnswersSection({
  answers,
  issues,
  onFieldChange,
  onSave,
  saveAttempted,
  status,
  statusRef
}: ReusableAnswersSectionProps) {
  return (
    <section className="panel-section">
      <h2>Reusable Answers</h2>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Reusable Answers need attention</strong>
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
          Sponsorship answer
          {saveAttempted &&
            getReusableAnswerIssueForField(issues, "sponsorshipAnswer") && (
              <span className="field-alert">
                {getReusableAnswerIssueForField(issues, "sponsorshipAnswer")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getReusableAnswerIssueForField(issues, "sponsorshipAnswer")
            )}
            value={answers.sponsorshipAnswer}
            onChange={(event) =>
              onFieldChange("sponsorshipAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Relocation answer
          {saveAttempted &&
            getReusableAnswerIssueForField(issues, "relocationAnswer") && (
              <span className="field-alert">
                {getReusableAnswerIssueForField(issues, "relocationAnswer")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getReusableAnswerIssueForField(issues, "relocationAnswer")
            )}
            value={answers.relocationAnswer}
            onChange={(event) =>
              onFieldChange("relocationAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Work authorisation answer
          {saveAttempted &&
            getReusableAnswerIssueForField(
              issues,
              "workAuthorisationAnswer"
            ) && (
              <span className="field-alert">
                {getReusableAnswerIssueForField(
                  issues,
                  "workAuthorisationAnswer"
                )}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getReusableAnswerIssueForField(
                  issues,
                  "workAuthorisationAnswer"
                )
            )}
            value={answers.workAuthorisationAnswer}
            onChange={(event) =>
              onFieldChange("workAuthorisationAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Notice period answer
          {saveAttempted &&
            getReusableAnswerIssueForField(issues, "noticePeriodAnswer") && (
              <span className="field-alert">
                {getReusableAnswerIssueForField(issues, "noticePeriodAnswer")}
              </span>
            )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted &&
                getReusableAnswerIssueForField(issues, "noticePeriodAnswer")
            )}
            value={answers.noticePeriodAnswer}
            onChange={(event) =>
              onFieldChange("noticePeriodAnswer", event.target.value)
            }
          />
        </label>

        <button type="button" onClick={onSave}>
          Save Reusable Answers
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
