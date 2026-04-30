import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  getApplicationContentDraft,
  getJobAnalysisDraft,
  getProfile,
  getTrackerDraft,
  saveApplicationContentDraft,
  saveJobAnalysisDraft,
  saveProfile,
  saveTrackerDraft,
  type ApplicationStatus,
  type ApplicationContentDraft,
  type CandidateProfile,
  type JobAnalysisDraft,
  type TrackerDraft
} from "../lib/storage"
import {
  getApplicationContentIssueForField,
  getIssueForField,
  getJobIssueForField,
  getTrackerIssueForField,
  validateApplicationContentDraft,
  validateJobAnalysisDraft,
  validateProfile,
  validateTrackerDraft
} from "../lib/validation"

type Section = "profile" | "job-analysis" | "application-content" | "tracker"
type SaveAttempts = Record<Section, boolean>

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

const emptyApplicationContentDraft: ApplicationContentDraft = {
  coverLetter: "",
  profileSummary: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

const emptyTrackerDraft: TrackerDraft = {
  roleTitle: "",
  company: "",
  applicationUrl: "",
  status: "draft",
  nextAction: "",
  nextActionDate: "",
  notes: ""
}

const applicationStatuses: ApplicationStatus[] = [
  "draft",
  "applied",
  "interview",
  "rejected",
  "offer"
]

const sections: Array<{ id: Section; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "job-analysis", label: "Job Analysis" },
  { id: "application-content", label: "Application Content" },
  { id: "tracker", label: "Tracker" }
]

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [saveAttempts, setSaveAttempts] = useState<SaveAttempts>({
    profile: false,
    "job-analysis": false,
    "application-content": false,
    tracker: false
  })
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [jobAnalysisDraft, setJobAnalysisDraft] =
    useState<JobAnalysisDraft>(emptyJobAnalysisDraft)
  const [applicationContentDraft, setApplicationContentDraft] =
    useState<ApplicationContentDraft>(emptyApplicationContentDraft)
  const [trackerDraft, setTrackerDraft] =
    useState<TrackerDraft>(emptyTrackerDraft)
  const [status, setStatus] = useState("")
  const [jobStatus, setJobStatus] = useState("")
  const [contentStatus, setContentStatus] = useState("")
  const [trackerStatus, setTrackerStatus] = useState("")
  const profileStatusRef = useRef<HTMLParagraphElement | null>(null)
  const jobStatusRef = useRef<HTMLParagraphElement | null>(null)
  const contentStatusRef = useRef<HTMLParagraphElement | null>(null)
  const trackerStatusRef = useRef<HTMLParagraphElement | null>(null)

  const profileIssues = validateProfile(profile)
  const jobAnalysisIssues = validateJobAnalysisDraft(jobAnalysisDraft)
  const applicationContentIssues = validateApplicationContentDraft(
    applicationContentDraft
  )
  const trackerIssues = validateTrackerDraft(trackerDraft)

  const markSaveAttempted = (section: Section) => {
    setSaveAttempts((current) => ({ ...current, [section]: true }))
  }

  const goToSection = (section: Section) => {
    setActiveSection(section)
    setSaveAttempts({
      profile: false,
      "job-analysis": false,
      "application-content": false,
      tracker: false
    })
    setStatus("")
    setJobStatus("")
    setContentStatus("")
    setTrackerStatus("")
  }

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

      const savedApplicationContentDraft = await getApplicationContentDraft()
      if (savedApplicationContentDraft) {
        setApplicationContentDraft(savedApplicationContentDraft)
      }

      const savedTrackerDraft = await getTrackerDraft()
      if (savedTrackerDraft) {
        setTrackerDraft(savedTrackerDraft)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const statusRefs: Record<Section, HTMLParagraphElement | null> = {
      profile: profileStatusRef.current,
      "job-analysis": jobStatusRef.current,
      "application-content": contentStatusRef.current,
      tracker: trackerStatusRef.current
    }

    const activeStatus = {
      profile: status,
      "job-analysis": jobStatus,
      "application-content": contentStatus,
      tracker: trackerStatus
    }[activeSection]

    const statusElement = statusRefs[activeSection]

    if (!activeStatus || !statusElement) {
      return
    }

    statusElement.scrollIntoView({ behavior: "smooth", block: "center" })
    statusElement.focus({ preventScroll: true })
  }, [activeSection, status, jobStatus, contentStatus, trackerStatus])

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

  const updateApplicationContentField = <
    K extends keyof ApplicationContentDraft
  >(
    key: K,
    value: ApplicationContentDraft[K]
  ) => {
    setApplicationContentDraft((current) => ({ ...current, [key]: value }))
  }

  const updateTrackerField = <K extends keyof TrackerDraft>(
    key: K,
    value: TrackerDraft[K]
  ) => {
    setTrackerDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSaveProfile = async () => {
    markSaveAttempted("profile")

    if (profileIssues.length > 0) {
      setStatus("Complete the highlighted profile fields before saving.")
      return
    }

    await saveProfile(profile)
    setStatus("Profile saved")
    setTimeout(() => setStatus(""), 3500)
  }

  const handleSaveJobAnalysis = async () => {
    markSaveAttempted("job-analysis")

    if (jobAnalysisIssues.length > 0) {
      setJobStatus("Complete the highlighted job analysis fields before saving.")
      return
    }

    await saveJobAnalysisDraft(jobAnalysisDraft)
    setJobStatus("Job analysis draft saved")
    setTimeout(() => setJobStatus(""), 3500)
  }

  const handleSaveApplicationContent = async () => {
    markSaveAttempted("application-content")

    if (applicationContentIssues.length > 0) {
      setContentStatus(
        "Complete the highlighted application content fields before saving."
      )
      return
    }

    await saveApplicationContentDraft(applicationContentDraft)
    setContentStatus("Application content draft saved")
    setTimeout(() => setContentStatus(""), 3500)
  }

  const handleSaveTracker = async () => {
    markSaveAttempted("tracker")

    if (trackerIssues.length > 0) {
      setTrackerStatus("Complete the highlighted tracker fields before saving.")
      return
    }

    await saveTrackerDraft(trackerDraft)
    setTrackerStatus("Tracker draft saved")
    setTimeout(() => setTrackerStatus(""), 3500)
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
            onClick={() => goToSection(section.id)}
            type="button"
          >
            {section.label}
            {section.id === "profile" &&
              saveAttempts.profile &&
              profileIssues.length > 0 && (
              <span className="nav-alert" aria-label="Profile needs attention">
                !
              </span>
            )}
            {section.id === "job-analysis" &&
              saveAttempts["job-analysis"] &&
              jobAnalysisIssues.length > 0 && (
                <span
                  className="nav-alert"
                  aria-label="Job Analysis needs attention"
                >
                  !
                </span>
              )}
            {section.id === "application-content" &&
              saveAttempts["application-content"] &&
              applicationContentIssues.length > 0 && (
                <span
                  className="nav-alert"
                  aria-label="Application Content needs attention"
                >
                  !
                </span>
              )}
            {section.id === "tracker" &&
              saveAttempts.tracker &&
              trackerIssues.length > 0 && (
              <span className="nav-alert" aria-label="Tracker needs attention">
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
            {saveAttempts.profile && profileIssues.length > 0 && (
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
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "fullName") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "fullName")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile &&
                    getIssueForField(profileIssues, "fullName")
                )}
                value={profile.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
              />
            </label>

            <label>
              Email
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "email") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "email")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile && getIssueForField(profileIssues, "email")
                )}
                type="email"
                value={profile.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            <label>
              Phone
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "phone") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "phone")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile && getIssueForField(profileIssues, "phone")
                )}
                value={profile.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>

            <label>
              Current country
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "currentCountry") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "currentCountry")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile &&
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
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "currentCity") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "currentCity")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile &&
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
              {saveAttempts.profile &&
                getIssueForField(profileIssues, "noticePeriod") && (
                <span className="field-alert">
                  {getIssueForField(profileIssues, "noticePeriod")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.profile &&
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

            {status && (
              <p
                className="status-message"
                ref={profileStatusRef}
                role="status"
                tabIndex={-1}
              >
                {status}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "job-analysis" ? (
        <section className="panel-section">
          <h2>Job Analysis</h2>

          <div className="form-grid">
            {saveAttempts["job-analysis"] && jobAnalysisIssues.length > 0 && (
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
              {saveAttempts["job-analysis"] &&
                getJobIssueForField(jobAnalysisIssues, "jobTitle") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "jobTitle")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts["job-analysis"] &&
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
              {saveAttempts["job-analysis"] &&
                getJobIssueForField(jobAnalysisIssues, "company") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "company")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts["job-analysis"] &&
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
              {saveAttempts["job-analysis"] &&
                getJobIssueForField(jobAnalysisIssues, "jobUrl") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "jobUrl")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts["job-analysis"] &&
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
              {saveAttempts["job-analysis"] &&
                getJobIssueForField(jobAnalysisIssues, "location") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "location")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts["job-analysis"] &&
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
              {saveAttempts["job-analysis"] &&
                getJobIssueForField(jobAnalysisIssues, "workMode") && (
                <span className="field-alert">
                  {getJobIssueForField(jobAnalysisIssues, "workMode")}
                </span>
              )}
              <select
                aria-invalid={Boolean(
                  saveAttempts["job-analysis"] &&
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

            {jobStatus && (
              <p
                className="status-message"
                ref={jobStatusRef}
                role="status"
                tabIndex={-1}
              >
                {jobStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "application-content" ? (
        <section className="panel-section">
          <h2>Application Content</h2>

          <div className="form-grid">
            {saveAttempts["application-content"] &&
              applicationContentIssues.length > 0 && (
              <div className="alert-panel" role="alert">
                <strong>Application Content needs attention</strong>
                <ul>
                  {applicationContentIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label>
              Cover letter
              {saveAttempts["application-content"] &&
                getApplicationContentIssueForField(
                  applicationContentIssues,
                  "coverLetter"
                ) && (
                <span className="field-alert">
                  {getApplicationContentIssueForField(
                    applicationContentIssues,
                    "coverLetter"
                  )}
                </span>
              )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["application-content"] &&
                    getApplicationContentIssueForField(
                    applicationContentIssues,
                    "coverLetter"
                  )
                )}
                value={applicationContentDraft.coverLetter}
                onChange={(event) =>
                  updateApplicationContentField(
                    "coverLetter",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Profile summary
              {saveAttempts["application-content"] &&
                getApplicationContentIssueForField(
                  applicationContentIssues,
                  "profileSummary"
                ) && (
                <span className="field-alert">
                  {getApplicationContentIssueForField(
                    applicationContentIssues,
                    "profileSummary"
                  )}
                </span>
              )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["application-content"] &&
                    getApplicationContentIssueForField(
                    applicationContentIssues,
                    "profileSummary"
                  )
                )}
                value={applicationContentDraft.profileSummary}
                onChange={(event) =>
                  updateApplicationContentField(
                    "profileSummary",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Motivation answer
              {saveAttempts["application-content"] &&
                getApplicationContentIssueForField(
                  applicationContentIssues,
                  "motivationAnswer"
                ) && (
                <span className="field-alert">
                  {getApplicationContentIssueForField(
                    applicationContentIssues,
                    "motivationAnswer"
                  )}
                </span>
              )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["application-content"] &&
                    getApplicationContentIssueForField(
                    applicationContentIssues,
                    "motivationAnswer"
                  )
                )}
                value={applicationContentDraft.motivationAnswer}
                onChange={(event) =>
                  updateApplicationContentField(
                    "motivationAnswer",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Strengths answer
              <textarea
                value={applicationContentDraft.strengthsAnswer}
                onChange={(event) =>
                  updateApplicationContentField(
                    "strengthsAnswer",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Availability answer
              <textarea
                value={applicationContentDraft.availabilityAnswer}
                onChange={(event) =>
                  updateApplicationContentField(
                    "availabilityAnswer",
                    event.target.value
                  )
                }
              />
            </label>

            <button type="button" onClick={handleSaveApplicationContent}>
              Save Application Content
            </button>

            {contentStatus && (
              <p
                className="status-message"
                ref={contentStatusRef}
                role="status"
                tabIndex={-1}
              >
                {contentStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "tracker" ? (
        <section className="panel-section">
          <h2>Tracker</h2>

          <div className="form-grid">
            {saveAttempts.tracker && trackerIssues.length > 0 && (
              <div className="alert-panel" role="alert">
                <strong>Tracker needs attention</strong>
                <ul>
                  {trackerIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label>
              Role title
              {saveAttempts.tracker &&
                getTrackerIssueForField(trackerIssues, "roleTitle") && (
                <span className="field-alert">
                  {getTrackerIssueForField(trackerIssues, "roleTitle")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.tracker &&
                    getTrackerIssueForField(trackerIssues, "roleTitle")
                )}
                value={trackerDraft.roleTitle}
                onChange={(event) =>
                  updateTrackerField("roleTitle", event.target.value)
                }
              />
            </label>

            <label>
              Company
              {saveAttempts.tracker &&
                getTrackerIssueForField(trackerIssues, "company") && (
                <span className="field-alert">
                  {getTrackerIssueForField(trackerIssues, "company")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.tracker &&
                    getTrackerIssueForField(trackerIssues, "company")
                )}
                value={trackerDraft.company}
                onChange={(event) =>
                  updateTrackerField("company", event.target.value)
                }
              />
            </label>

            <label>
              Application URL
              {saveAttempts.tracker &&
                getTrackerIssueForField(trackerIssues, "applicationUrl") && (
                <span className="field-alert">
                  {getTrackerIssueForField(trackerIssues, "applicationUrl")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.tracker &&
                    getTrackerIssueForField(trackerIssues, "applicationUrl")
                )}
                type="url"
                value={trackerDraft.applicationUrl}
                onChange={(event) =>
                  updateTrackerField("applicationUrl", event.target.value)
                }
              />
            </label>

            <label>
              Status
              <select
                value={trackerDraft.status}
                onChange={(event) =>
                  updateTrackerField(
                    "status",
                    event.target.value as ApplicationStatus
                  )
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
              {saveAttempts.tracker &&
                getTrackerIssueForField(trackerIssues, "nextAction") && (
                <span className="field-alert">
                  {getTrackerIssueForField(trackerIssues, "nextAction")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.tracker &&
                    getTrackerIssueForField(trackerIssues, "nextAction")
                )}
                value={trackerDraft.nextAction}
                onChange={(event) =>
                  updateTrackerField("nextAction", event.target.value)
                }
              />
            </label>

            <label>
              Next action date
              {saveAttempts.tracker &&
                getTrackerIssueForField(trackerIssues, "nextActionDate") && (
                <span className="field-alert">
                  {getTrackerIssueForField(trackerIssues, "nextActionDate")}
                </span>
              )}
              <input
                aria-invalid={Boolean(
                  saveAttempts.tracker &&
                    getTrackerIssueForField(trackerIssues, "nextActionDate")
                )}
                type="date"
                value={trackerDraft.nextActionDate}
                onChange={(event) =>
                  updateTrackerField("nextActionDate", event.target.value)
                }
              />
            </label>

            <label>
              Notes
              <textarea
                value={trackerDraft.notes}
                onChange={(event) =>
                  updateTrackerField("notes", event.target.value)
                }
              />
            </label>

            <button type="button" onClick={handleSaveTracker}>
              Save Tracker
            </button>

            {trackerStatus && (
              <p
                className="status-message"
                ref={trackerStatusRef}
                role="status"
                tabIndex={-1}
              >
                {trackerStatus}
              </p>
            )}
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
