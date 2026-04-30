import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  getJobAnalysisDraft,
  getProfile,
  saveJobAnalysisDraft,
  saveProfile,
  type CandidateProfile,
  type JobAnalysisDraft
} from "../lib/storage"

type Section = "profile" | "job-analysis" | "application-content" | "tracker"
type ProfileIssue = {
  field: keyof CandidateProfile
  message: string
}
type JobAnalysisIssue = {
  field: keyof JobAnalysisDraft
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

const emptyJobAnalysisDraft: JobAnalysisDraft = {
  jobTitle: "",
  company: "",
  jobUrl: "",
  location: "",
  workMode: "unknown",
  notes: ""
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

const requiredJobAnalysisFields: Array<{
  field: keyof JobAnalysisDraft
  label: string
}> = [
  { field: "jobTitle", label: "Job title" },
  { field: "company", label: "Company" },
  { field: "jobUrl", label: "Job URL" },
  { field: "location", label: "Location/country" }
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

function validateJobAnalysisDraft(
  draft: JobAnalysisDraft
): JobAnalysisIssue[] {
  const issues: JobAnalysisIssue[] = []

  for (const { field, label } of requiredJobAnalysisFields) {
    const value = draft[field]

    if (typeof value === "string" && value.trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (draft.workMode === "unknown") {
    issues.push({ field: "workMode", message: "Work mode is required." })
  }

  if (draft.jobUrl.trim() !== "") {
    try {
      const url = new URL(draft.jobUrl)
      if (!["http:", "https:"].includes(url.protocol)) {
        issues.push({
          field: "jobUrl",
          message: "Job URL must start with http or https."
        })
      }
    } catch {
      issues.push({ field: "jobUrl", message: "Job URL format does not match." })
    }
  }

  return issues
}

function getIssueForField(
  issues: ProfileIssue[],
  field: keyof CandidateProfile
) {
  return issues.find((issue) => issue.field === field)?.message
}

function getJobIssueForField(
  issues: JobAnalysisIssue[],
  field: keyof JobAnalysisDraft
) {
  return issues.find((issue) => issue.field === field)?.message
}

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [jobAnalysisDraft, setJobAnalysisDraft] =
    useState<JobAnalysisDraft>(emptyJobAnalysisDraft)
  const [status, setStatus] = useState("")
  const [jobStatus, setJobStatus] = useState("")

  const profileIssues = validateProfile(profile)
  const jobAnalysisIssues = validateJobAnalysisDraft(jobAnalysisDraft)

  useEffect(() => {
    const loadProfile = async () => {
      const savedProfile = await getProfile()
      if (savedProfile) {
        setProfile(savedProfile)
      }

      const savedJobAnalysisDraft = await getJobAnalysisDraft()
      if (savedJobAnalysisDraft) {
        setJobAnalysisDraft(savedJobAnalysisDraft)
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

  const updateJobAnalysisField = <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => {
    setJobAnalysisDraft((current) => ({ ...current, [key]: value }))
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

  const handleSaveJobAnalysis = async () => {
    if (jobAnalysisIssues.length > 0) {
      setJobStatus("Complete the highlighted job analysis fields before saving.")
      return
    }

    await saveJobAnalysisDraft(jobAnalysisDraft)
    setJobStatus("Job analysis draft saved")
    setTimeout(() => setJobStatus(""), 2000)
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
            {section.id === "job-analysis" &&
              jobAnalysisIssues.length > 0 && (
                <span
                  className="nav-alert"
                  aria-label="Job Analysis needs attention"
                >
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
      ) : activeSection === "job-analysis" ? (
        <section className="panel-section">
          <h2>Job Analysis</h2>

          <div className="form-grid">
            {jobAnalysisIssues.length > 0 && (
              <div className="alert-panel" role="alert">
                <strong>Job Analysis needs attention</strong>
                <ul>
                  {jobAnalysisIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label>
              Job title
              {getJobIssueForField(jobAnalysisIssues, "jobTitle") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "jobTitle")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getJobIssueForField(jobAnalysisIssues, "jobTitle")
                )}
                value={jobAnalysisDraft.jobTitle}
                onChange={(event) =>
                  updateJobAnalysisField("jobTitle", event.target.value)
                }
              />
            </label>

            <label>
              Company
              {getJobIssueForField(jobAnalysisIssues, "company") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "company")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getJobIssueForField(jobAnalysisIssues, "company")
                )}
                value={jobAnalysisDraft.company}
                onChange={(event) =>
                  updateJobAnalysisField("company", event.target.value)
                }
              />
            </label>

            <label>
              Job URL
              {getJobIssueForField(jobAnalysisIssues, "jobUrl") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "jobUrl")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getJobIssueForField(jobAnalysisIssues, "jobUrl")
                )}
                type="url"
                value={jobAnalysisDraft.jobUrl}
                onChange={(event) =>
                  updateJobAnalysisField("jobUrl", event.target.value)
                }
              />
            </label>

            <label>
              Location/country
              {getJobIssueForField(jobAnalysisIssues, "location") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "location")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  getJobIssueForField(jobAnalysisIssues, "location")
                )}
                value={jobAnalysisDraft.location}
                onChange={(event) =>
                  updateJobAnalysisField("location", event.target.value)
                }
              />
            </label>

            <label>
              Work mode
              {getJobIssueForField(jobAnalysisIssues, "workMode") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "workMode")}
                </span>
              )}
              <select
                aria-invalid={Boolean(
                  getJobIssueForField(jobAnalysisIssues, "workMode")
                )}
                value={jobAnalysisDraft.workMode}
                onChange={(event) =>
                  updateJobAnalysisField(
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
                value={jobAnalysisDraft.notes}
                onChange={(event) =>
                  updateJobAnalysisField("notes", event.target.value)
                }
              />
            </label>

            <button type="button" onClick={handleSaveJobAnalysis}>
              Save Job Analysis
            </button>

            {jobStatus && <p role="status">{jobStatus}</p>}
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
