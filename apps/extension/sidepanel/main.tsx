import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  getProfile,
  saveProfile,
  type CandidateProfile
} from "../lib/storage"

type Section = "profile" | "job-analysis" | "application-content" | "tracker"
type ProfileIssue = {
  field: keyof CandidateProfile
  message: string
}

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  currentCountry: "",
  currentCity: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  noticePeriod: ""
}

const sections: Array<{ id: Section; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "job-analysis", label: "Job Analysis" },
  { id: "application-content", label: "Application Content" },
  { id: "tracker", label: "Tracker" }
]

const requiredProfileFields: Array<{
  field: keyof CandidateProfile
  label: string
}> = [
  { field: "fullName", label: "Full name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "currentCountry", label: "Current country" },
  { field: "currentCity", label: "Current city" },
  { field: "noticePeriod", label: "Notice period" }
]

function validateProfile(profile: CandidateProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = []

  for (const { field, label } of requiredProfileFields) {
    const value = profile[field]

    if (typeof value === "string" && value.trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (
    profile.email.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
  ) {
    issues.push({ field: "email", message: "Email format does not match." })
  }

  if (
    profile.phone.trim() !== "" &&
    !/^[+\d][\d\s().-]{6,}$/.test(profile.phone.trim())
  ) {
    issues.push({ field: "phone", message: "Phone format does not match." })
  }

  return issues
}

function getIssueForField(
  issues: ProfileIssue[],
  field: keyof CandidateProfile
) {
  return issues.find((issue) => issue.field === field)?.message
}

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [status, setStatus] = useState("")

  const profileIssues = validateProfile(profile)

  useEffect(() => {
    const loadProfile = async () => {
      const savedProfile = await getProfile()
      if (savedProfile) {
        setProfile(savedProfile)
      }
    }

    loadProfile()
  }, [])

  const updateField = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleSaveProfile = async () => {
    if (profileIssues.length > 0) {
      setStatus("Complete the highlighted profile fields before saving.")
      return
    }

    await saveProfile(profile)
    setStatus("Profile saved")
    setTimeout(() => setStatus(""), 2000)
  }

  return (
    <main className="side-panel-shell">
      <header>
        <h1>AutoTime EU Apply</h1>
      </header>

      <nav className="section-nav" aria-label="AutoTime sections">
        {sections.map((section) => (
          <button
            aria-current={activeSection === section.id ? "page" : undefined}
            className={activeSection === section.id ? "active" : ""}
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
            {section.id === "profile" && profileIssues.length > 0 && (
              <span className="nav-alert" aria-label="Profile needs attention">
                !
              </span>
            )}
          </button>
        ))}
      </nav>

      {activeSection === "profile" ? (
        <section className="panel-section">
          <h2>Profile</h2>

          <div className="form-grid">
            {profileIssues.length > 0 && (
              <div className="alert-panel" role="alert">
                <strong>Profile needs attention</strong>
                <ul>
                  {profileIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label>
              Full name
              {getIssueForField(profileIssues, "fullName") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "fullName")}
                </span>
              )}
              <input
                aria-invalid={Boolean(getIssueForField(profileIssues, "fullName"))}
                value={profile.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
              />
            </label>

            <label>
              Email
              {getIssueForField(profileIssues, "email") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "email")}
                </span>
              )}
              <input
                aria-invalid={Boolean(getIssueForField(profileIssues, "email"))}
                type="email"
                value={profile.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            <label>
              Phone
              {getIssueForField(profileIssues, "phone") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "phone")}
                </span>
              )}
              <input
                aria-invalid={Boolean(getIssueForField(profileIssues, "phone"))}
                value={profile.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>

            <label>
              Current country
              {getIssueForField(profileIssues, "currentCountry") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "currentCountry")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getIssueForField(profileIssues, "currentCountry")
                )}
                value={profile.currentCountry}
                onChange={(event) =>
                  updateField("currentCountry", event.target.value)
                }
              />
            </label>

            <label>
              Current city
              {getIssueForField(profileIssues, "currentCity") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "currentCity")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getIssueForField(profileIssues, "currentCity")
                )}
                value={profile.currentCity}
                onChange={(event) =>
                  updateField("currentCity", event.target.value)
                }
              />
            </label>

            <label>
              Notice period
              {getIssueForField(profileIssues, "noticePeriod") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "noticePeriod")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getIssueForField(profileIssues, "noticePeriod")
                )}
                value={profile.noticePeriod}
                onChange={(event) =>
                  updateField("noticePeriod", event.target.value)
                }
              />
            </label>

            <label className="checkbox-row">
              <input
                checked={profile.sponsorshipNeeded}
                type="checkbox"
                onChange={(event) =>
                  updateField("sponsorshipNeeded", event.target.checked)
                }
              />
              Sponsorship needed
            </label>

            <label>
              Relocation willingness
              <select
                value={profile.relocationWillingness}
                onChange={(event) =>
                  updateField(
                    "relocationWillingness",
                    event.target
                      .value as CandidateProfile["relocationWillingness"]
                  )
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="depends">Depends</option>
              </select>
            </label>

            <button type="button" onClick={handleSaveProfile}>
              Save Profile
            </button>

            {status && <p role="status">{status}</p>}
          </div>
        </section>
      ) : (
        <PlaceholderSection section={activeSection} />
      )}
    </main>
  )
}

function PlaceholderSection({ section }: { section: Section }) {
  const title = sections.find((item) => item.id === section)?.label

  return (
    <section className="panel-section">
      <h2>{title}</h2>
      <p>This section is ready for the next MVP step.</p>
    </section>
  )
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <SidePanelApp />
)
