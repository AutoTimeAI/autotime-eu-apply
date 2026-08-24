// "Optional Answers" panel: editable form for reusable answers to common
// application questions (sponsorship, relocation, work authorisation,
// notice period, salary, motivation, strengths, availability), used by
// autofill's textarea detection. Part of the legacy multi-section side
// panel layout, currently unreached since `main.tsx` sets
// `renderLegacyTools = false`.
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

/** Renders the optional-answers form with per-field validation messages (shown only after `saveAttempted`, and only for answers that are non-empty but too short) and the save action. */
export function ReusableAnswersSection({
  answers,
  issues,
  onFieldChange,
  onSave,
  saveAttempted,
  status,
  statusRef
}: ReusableAnswersSectionProps) {
  const salaryIssue = getReusableAnswerIssueForField(
    issues,
    "salaryExpectationAnswer"
  )
  const motivationIssue = getReusableAnswerIssueForField(
    issues,
    "motivationAnswer"
  )
  const strengthsIssue = getReusableAnswerIssueForField(
    issues,
    "strengthsAnswer"
  )
  const availabilityIssue = getReusableAnswerIssueForField(
    issues,
    "availabilityAnswer"
  )

  return (
    <section className="panel-section">
      <h2>Optional Answers</h2>
      <p className="empty-state">
        These are optional shortcuts for repeated application questions. Leave
        them blank if you prefer to manage fuller answers in the web dashboard.
      </p>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Optional answers need attention</strong>
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

        <label>
          Salary expectation answer
          {saveAttempted && salaryIssue && (
            <span className="field-alert">{salaryIssue}</span>
          )}
          <textarea
            aria-invalid={Boolean(saveAttempted && salaryIssue)}
            value={answers.salaryExpectationAnswer}
            onChange={(event) =>
              onFieldChange("salaryExpectationAnswer", event.target.value)
            }
          />
        </label>

        <label>
          Motivation answer
          {saveAttempted && motivationIssue && (
            <span className="field-alert">{motivationIssue}</span>
          )}
          <textarea
            aria-invalid={Boolean(saveAttempted && motivationIssue)}
            value={answers.motivationAnswer}
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
            value={answers.strengthsAnswer}
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
            value={answers.availabilityAnswer}
            onChange={(event) =>
              onFieldChange("availabilityAnswer", event.target.value)
            }
          />
        </label>

        <button type="button" onClick={onSave}>
          Save optional answers
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
