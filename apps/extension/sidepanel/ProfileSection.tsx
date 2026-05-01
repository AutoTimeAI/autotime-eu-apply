import type { Ref } from "react"
import { countryOptions } from "../lib/countries"
import type { CandidateProfile } from "../lib/storage"
import type { ProfileIssue } from "../lib/validation"
import { getIssueForField } from "../lib/validation"
import { noticePeriodOptions } from "./constants"
import { getStatusClassName } from "./utils"

type ProfileSectionProps = {
  issues: ProfileIssue[]
  onAutofillCurrentPage: () => void
  onFieldChange: <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => void
  onSave: () => void
  profile: CandidateProfile
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

export function ProfileSection({
  issues,
  onAutofillCurrentPage,
  onFieldChange,
  onSave,
  profile,
  saveAttempted,
  status,
  statusRef
}: ProfileSectionProps) {
  return (
    <section className="panel-section">
      <h2>Profile</h2>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Profile needs attention</strong>
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
          Full name
          {saveAttempted && getIssueForField(issues, "fullName") && (
            <span className="field-alert">
              {getIssueForField(issues, "fullName")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "fullName")
            )}
            value={profile.fullName}
            onChange={(event) =>
              onFieldChange("fullName", event.target.value)
            }
          />
        </label>

        <label>
          Email
          {saveAttempted && getIssueForField(issues, "email") && (
            <span className="field-alert">
              {getIssueForField(issues, "email")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "email")
            )}
            type="email"
            value={profile.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
          />
        </label>

        <label>
          Phone
          {saveAttempted && getIssueForField(issues, "phone") && (
            <span className="field-alert">
              {getIssueForField(issues, "phone")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "phone")
            )}
            value={profile.phone}
            onChange={(event) => onFieldChange("phone", event.target.value)}
          />
        </label>

        <label>
          Current country
          {saveAttempted && getIssueForField(issues, "currentCountry") && (
            <span className="field-alert">
              {getIssueForField(issues, "currentCountry")}
            </span>
          )}
          <select
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "currentCountry")
            )}
            value={profile.currentCountry}
            onChange={(event) =>
              onFieldChange("currentCountry", event.target.value)
            }
          >
            <option value="">Select country</option>
            {countryOptions.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name} ({country.callingCode})
              </option>
            ))}
          </select>
        </label>

        <label>
          Current city
          {saveAttempted && getIssueForField(issues, "currentCity") && (
            <span className="field-alert">
              {getIssueForField(issues, "currentCity")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "currentCity")
            )}
            value={profile.currentCity}
            onChange={(event) =>
              onFieldChange("currentCity", event.target.value)
            }
          />
        </label>

        <label>
          Notice period
          {saveAttempted && getIssueForField(issues, "noticePeriod") && (
            <span className="field-alert">
              {getIssueForField(issues, "noticePeriod")}
            </span>
          )}
          <select
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "noticePeriod")
            )}
            value={profile.noticePeriod}
            onChange={(event) =>
              onFieldChange("noticePeriod", event.target.value)
            }
          >
            <option value="">Select notice period</option>
            {noticePeriodOptions.map((noticePeriod) => (
              <option key={noticePeriod} value={noticePeriod}>
                {noticePeriod}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input
            checked={profile.sponsorshipNeeded}
            type="checkbox"
            onChange={(event) =>
              onFieldChange("sponsorshipNeeded", event.target.checked)
            }
          />
          Sponsorship needed
        </label>

        <label>
          Relocation willingness
          <select
            value={profile.relocationWillingness}
            onChange={(event) =>
              onFieldChange(
                "relocationWillingness",
                event.target.value as CandidateProfile["relocationWillingness"]
              )
            }
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="depends">Depends</option>
          </select>
        </label>

        <button type="button" onClick={onSave}>
          Save Profile
        </button>

        <button type="button" onClick={onAutofillCurrentPage}>
          Autofill Current Page
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
