// "Profile essentials" panel: a minimal editable subset of CandidateProfile
// (name, email, target countries/roles, work authorisation, CV text) kept
// in the extension for autofill/local analysis - the fuller profile lives
// in the web dashboard. Part of the legacy multi-section side panel
// layout, currently unreached since `main.tsx` sets
// `renderLegacyTools = false`.
import type { Ref } from "react"
import type { CandidateProfile } from "../lib/storage"
import type { ProfileIssue } from "../lib/validation"
import { getIssueForField } from "../lib/validation"
import { getStatusClassName } from "./utils"

type ProfileSectionProps = {
  issues: ProfileIssue[]
  onAutofillCurrentPage: () => void
  onFieldChange: <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => void
  onOpenProfileSetup: () => void
  onSave: () => void
  profile: CandidateProfile
  saveAttempted: boolean
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

/** Renders the profile essentials form with per-field validation messages (shown only after `saveAttempted`) and the save/autofill/open-full-setup actions. */
export function ProfileSection({
  issues,
  onAutofillCurrentPage,
  onFieldChange,
  onOpenProfileSetup,
  onSave,
  profile,
  saveAttempted,
  status,
  statusRef
}: ProfileSectionProps) {
  return (
    <section className="panel-section">
      <h2>Profile essentials</h2>
      <p className="empty-state">
        Keep only the evidence needed for extension actions here. Manage the
        full profile, reusable answers and verification details in the web
        dashboard.
      </p>

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
          Target countries
          {saveAttempted && getIssueForField(issues, "targetCountries") && (
            <span className="field-alert">
              {getIssueForField(issues, "targetCountries")}
            </span>
          )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "targetCountries")
            )}
            placeholder="Example: United Kingdom, Ireland, Netherlands"
            value={profile.targetCountries}
            onChange={(event) =>
              onFieldChange("targetCountries", event.target.value)
            }
          />
        </label>

        <label>
          Target roles
          {saveAttempted && getIssueForField(issues, "targetRoles") && (
            <span className="field-alert">
              {getIssueForField(issues, "targetRoles")}
            </span>
          )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "targetRoles")
            )}
            placeholder="Example: Business Analyst, Product Analyst, Application Support Analyst"
            value={profile.targetRoles}
            onChange={(event) =>
              onFieldChange("targetRoles", event.target.value)
            }
          />
        </label>

        <label>
          Work authorisation status
          {saveAttempted && getIssueForField(issues, "workRightDetails") && (
            <span className="field-alert">
              {getIssueForField(issues, "workRightDetails")}
            </span>
          )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "workRightDetails")
            )}
            placeholder="Example: UK citizen, settled status, Skilled Worker visa, EU citizen, or no sponsorship required. Add only facts you can verify."
            value={profile.workRightDetails}
            onChange={(event) =>
              onFieldChange("workRightDetails", event.target.value)
            }
          />
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

        <label>
          CV text
          {saveAttempted && getIssueForField(issues, "baseCvText") && (
            <span className="field-alert">
              {getIssueForField(issues, "baseCvText")}
            </span>
          )}
          <textarea
            aria-invalid={Boolean(
              saveAttempted && getIssueForField(issues, "baseCvText")
            )}
            placeholder="Paste enough CV text to support job matching. The extension will not invent experience."
            value={profile.baseCvText}
            onChange={(event) =>
              onFieldChange("baseCvText", event.target.value)
            }
          />
        </label>

        <button type="button" onClick={onSave}>
          Save essentials
        </button>

        <button type="button" onClick={onAutofillCurrentPage}>
          Autofill Current Page
        </button>

        <button type="button" onClick={onOpenProfileSetup}>
          Open full profile setup
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
