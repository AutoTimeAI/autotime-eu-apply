import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import { countryOptions } from "../lib/countries"
import {
  formatJobPageNotes,
  inferJobPageDetails,
  type JobPageDetails
} from "../lib/job-page"
import {
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearProfile,
  clearTrackerDraft,
  getApplications,
  getApplicationContentDraft,
  getJobAnalysisDraft,
  getProfile,
  getTrackerDraft,
  saveApplication,
  saveApplicationContentDraft,
  saveJobAnalysisDraft,
  saveProfile,
  saveTrackerDraft,
  updateApplication,
  type ApplicationStatus,
  type ApplicationRecord,
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

type Section =
  | "profile"
  | "profile-view"
  | "job-analysis"
  | "job-analysis-view"
  | "application-content"
  | "application-content-view"
  | "tracker"
  | "tracker-view"
type SaveAttempts = Record<Section, boolean>
type JobPageResponse = JobPageDetails & {
  message?: string
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

const noticePeriodOptions = [
  "Immediately available",
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months",
  "More than 3 months",
  "Negotiable"
]

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function normalizeApplicationUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}

const sections: Array<{ id: Section; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "profile-view", label: "View Profile" },
  { id: "job-analysis", label: "Job Analysis" },
  { id: "job-analysis-view", label: "View Job Analysis" },
  { id: "application-content", label: "Application Content" },
  { id: "application-content-view", label: "View Content" },
  { id: "tracker", label: "Tracker" },
  { id: "tracker-view", label: "View Tracker" }
]

function getStatusClassName(message: string) {
  return message.startsWith("Complete ") || message.startsWith("Could not ")
    ? "status-message status-message-error"
    : "status-message"
}

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [saveAttempts, setSaveAttempts] = useState<SaveAttempts>({
    profile: false,
    "profile-view": false,
    "job-analysis": false,
    "job-analysis-view": false,
    "application-content": false,
    "application-content-view": false,
    tracker: false,
    "tracker-view": false
  })
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [savedProfile, setSavedProfile] = useState<CandidateProfile | null>(
    null
  )
  const [jobAnalysisDraft, setJobAnalysisDraft] = useState<JobAnalysisDraft>(
    emptyJobAnalysisDraft
  )
  const [savedJobAnalysisDraft, setSavedJobAnalysisDraft] =
    useState<JobAnalysisDraft | null>(null)
  const [applicationContentDraft, setApplicationContentDraft] =
    useState<ApplicationContentDraft>(emptyApplicationContentDraft)
  const [savedApplicationContentDraft, setSavedApplicationContentDraft] =
    useState<ApplicationContentDraft | null>(null)
  const [trackerDraft, setTrackerDraft] =
    useState<TrackerDraft>(emptyTrackerDraft)
  const [savedTrackerDraft, setSavedTrackerDraft] =
    useState<TrackerDraft | null>(null)
  const [status, setStatus] = useState("")
  const [jobStatus, setJobStatus] = useState("")
  const [contentStatus, setContentStatus] = useState("")
  const [trackerStatus, setTrackerStatus] = useState("")
  const profileStatusRef = useRef<HTMLParagraphElement | null>(null)
  const jobStatusRef = useRef<HTMLParagraphElement | null>(null)
  const contentStatusRef = useRef<HTMLParagraphElement | null>(null)
  const trackerStatusRef = useRef<HTMLParagraphElement | null>(null)

  const profileIssues = useMemo(() => validateProfile(profile), [profile])
  const jobAnalysisIssues = useMemo(
    () => validateJobAnalysisDraft(jobAnalysisDraft),
    [jobAnalysisDraft]
  )
  const applicationContentIssues = useMemo(
    () => validateApplicationContentDraft(applicationContentDraft),
    [applicationContentDraft]
  )
  const trackerIssues = useMemo(
    () => validateTrackerDraft(trackerDraft),
    [trackerDraft]
  )

  const markSaveAttempted = (section: Section) => {
    setSaveAttempts((current) => ({ ...current, [section]: true }))
  }

  const clearSaveAttempt = (section: Section) => {
    setSaveAttempts((current) => ({ ...current, [section]: false }))
  }

  const goToSection = (section: Section) => {
    setActiveSection(section)
    setSaveAttempts({
      profile: false,
      "profile-view": false,
      "job-analysis": false,
      "job-analysis-view": false,
      "application-content": false,
      "application-content-view": false,
      tracker: false,
      "tracker-view": false
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
        setSavedProfile(savedProfile)
      }

      const savedJobAnalysisDraft = await getJobAnalysisDraft()
      if (savedJobAnalysisDraft) {
        setSavedJobAnalysisDraft(savedJobAnalysisDraft)
      }

      const savedApplicationContentDraft = await getApplicationContentDraft()
      if (savedApplicationContentDraft) {
        setSavedApplicationContentDraft(savedApplicationContentDraft)
      }

      const savedTrackerDraft = await getTrackerDraft()
      if (savedTrackerDraft) {
        setSavedTrackerDraft(savedTrackerDraft)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const statusRefs: Record<Section, HTMLParagraphElement | null> = {
      profile: profileStatusRef.current,
      "profile-view": null,
      "job-analysis": jobStatusRef.current,
      "job-analysis-view": null,
      "application-content": contentStatusRef.current,
      "application-content-view": null,
      tracker: trackerStatusRef.current,
      "tracker-view": null
    }

    const activeStatus = {
      profile: status,
      "profile-view": "",
      "job-analysis": jobStatus,
      "job-analysis-view": "",
      "application-content": contentStatus,
      "application-content-view": "",
      tracker: trackerStatus,
      "tracker-view": ""
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
    setSavedProfile(profile)
    setProfile(emptyProfile)
    clearSaveAttempt("profile")
    setStatus("Profile saved")
    setTimeout(() => setStatus(""), 3500)
  }

  const handleSaveJobAnalysis = async () => {
    markSaveAttempted("job-analysis")

    if (jobAnalysisIssues.length > 0) {
      setJobStatus(
        "Complete the highlighted job analysis fields before saving."
      )
      return
    }

    await saveJobAnalysisDraft(jobAnalysisDraft)
    setSavedJobAnalysisDraft(jobAnalysisDraft)
    setJobAnalysisDraft(emptyJobAnalysisDraft)
    clearSaveAttempt("job-analysis")
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
    setSavedApplicationContentDraft(applicationContentDraft)
    setApplicationContentDraft(emptyApplicationContentDraft)
    clearSaveAttempt("application-content")
    setContentStatus("Application content draft saved")
    setTimeout(() => setContentStatus(""), 3500)
  }

  const saveTrackerApplication = async (draft: TrackerDraft) => {
    const existingApplications = await getApplications()
    const normalizedUrl = normalizeApplicationUrl(draft.applicationUrl)
    const existingApplication = existingApplications.find(
      (application) =>
        normalizeApplicationUrl(application.url) === normalizedUrl
    )
    const trackerFields = {
      roleTitle: draft.roleTitle,
      company: draft.company,
      source: getHostname(draft.applicationUrl),
      status: draft.status,
      nextAction: draft.nextAction,
      nextActionDate: draft.nextActionDate,
      notes: draft.notes
    }

    if (existingApplication) {
      await updateApplication(existingApplication.id, trackerFields)
      return
    }

    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      title: draft.roleTitle,
      url: draft.applicationUrl,
      createdAt: new Date().toISOString(),
      ...trackerFields
    }

    await saveApplication(record)
  }

  const handleSaveTracker = async () => {
    markSaveAttempted("tracker")

    if (trackerIssues.length > 0) {
      setTrackerStatus("Complete the highlighted tracker fields before saving.")
      return
    }

    await saveTrackerDraft(trackerDraft)
    await saveTrackerApplication(trackerDraft)
    setSavedTrackerDraft(trackerDraft)
    setTrackerDraft(emptyTrackerDraft)
    clearSaveAttempt("tracker")
    setTrackerStatus("Tracker saved to applications")
    setTimeout(() => setTrackerStatus(""), 3500)
  }

  const handleImportCurrentJobPage = async () => {
    setTrackerStatus("Detecting current job page...")

    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.id) {
      setTrackerStatus("Could not access current tab.")
      return
    }

    try {
      const details = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_DETECT_JOB_PAGE"
      })) as JobPageResponse

      if (details.message && !details.roleTitle && !details.company) {
        setTrackerStatus(details.message)
        return
      }

      setTrackerDraft((current) => ({
        ...current,
        roleTitle: current.roleTitle || details.roleTitle,
        company: current.company || details.company,
        applicationUrl: current.applicationUrl || details.url,
        nextAction: current.nextAction || "Tailor application",
        notes: current.notes || formatJobPageNotes(details)
      }))
      clearSaveAttempt("tracker")
      setTrackerStatus("Current job page imported")
      setTimeout(() => setTrackerStatus(""), 3500)
    } catch {
      const details = inferJobPageDetails({
        title: activeTab.title,
        url: activeTab.url
      })

      if (!details.roleTitle && !details.url) {
        setTrackerStatus("Could not detect job details on this page.")
        return
      }

      setTrackerDraft((current) => ({
        ...current,
        roleTitle: current.roleTitle || details.roleTitle,
        applicationUrl: current.applicationUrl || details.url,
        nextAction: current.nextAction || "Tailor application",
        notes: current.notes || formatJobPageNotes(details)
      }))
      clearSaveAttempt("tracker")
      setTrackerStatus("Current tab imported")
      setTimeout(() => setTrackerStatus(""), 3500)
    }
  }

  const handleClearProfile = async () => {
    await clearProfile()
    setSavedProfile(null)
    setProfile(emptyProfile)
  }

  const handleClearJobAnalysis = async () => {
    await clearJobAnalysisDraft()
    setSavedJobAnalysisDraft(null)
    setJobAnalysisDraft(emptyJobAnalysisDraft)
  }

  const handleClearApplicationContent = async () => {
    await clearApplicationContentDraft()
    setSavedApplicationContentDraft(null)
    setApplicationContentDraft(emptyApplicationContentDraft)
  }

  const handleClearTracker = async () => {
    await clearTrackerDraft()
    setSavedTrackerDraft(null)
    setTrackerDraft(emptyTrackerDraft)
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
                <span
                  className="nav-alert"
                  aria-label="Profile needs attention"
                >
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
                <span
                  className="nav-alert"
                  aria-label="Tracker needs attention"
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
                  saveAttempts.profile &&
                  getIssueForField(profileIssues, "email")
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
                  saveAttempts.profile &&
                  getIssueForField(profileIssues, "phone")
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
              <select
                aria-invalid={Boolean(
                  saveAttempts.profile &&
                  getIssueForField(profileIssues, "currentCountry")
                )}
                value={profile.currentCountry}
                onChange={(event) =>
                  updateField("currentCountry", event.target.value)
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
              <select
                aria-invalid={Boolean(
                  saveAttempts.profile &&
                  getIssueForField(profileIssues, "noticePeriod")
                )}
                value={profile.noticePeriod}
                onChange={(event) =>
                  updateField("noticePeriod", event.target.value)
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
                className={getStatusClassName(status)}
                ref={profileStatusRef}
                role="status"
                tabIndex={-1}
              >
                {status}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "profile-view" ? (
        <section className="panel-section">
          <h2>View Profile</h2>

          {savedProfile ? (
            <>
              <dl className="profile-summary">
                <div>
                  <dt>Full name</dt>
                  <dd>{savedProfile.fullName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{savedProfile.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{savedProfile.phone}</dd>
                </div>
                <div>
                  <dt>Current country</dt>
                  <dd>{savedProfile.currentCountry}</dd>
                </div>
                <div>
                  <dt>Current city</dt>
                  <dd>{savedProfile.currentCity}</dd>
                </div>
                <div>
                  <dt>Sponsorship needed</dt>
                  <dd>{savedProfile.sponsorshipNeeded ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Relocation willingness</dt>
                  <dd>{savedProfile.relocationWillingness}</dd>
                </div>
                <div>
                  <dt>Notice period</dt>
                  <dd>{savedProfile.noticePeriod}</dd>
                </div>
              </dl>
              <button
                className="danger-button"
                type="button"
                onClick={handleClearProfile}
              >
                Clear Saved Profile
              </button>
            </>
          ) : (
            <p className="empty-state">No saved profile yet.</p>
          )}
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
                className={getStatusClassName(jobStatus)}
                ref={jobStatusRef}
                role="status"
                tabIndex={-1}
              >
                {jobStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "job-analysis-view" ? (
        <section className="panel-section">
          <h2>View Job Analysis</h2>

          {savedJobAnalysisDraft ? (
            <>
              <dl className="profile-summary">
                <div>
                  <dt>Job title</dt>
                  <dd>{savedJobAnalysisDraft.jobTitle}</dd>
                </div>
                <div>
                  <dt>Company</dt>
                  <dd>{savedJobAnalysisDraft.company}</dd>
                </div>
                <div>
                  <dt>Job URL</dt>
                  <dd>
                    <a
                      href={savedJobAnalysisDraft.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {savedJobAnalysisDraft.jobUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Location/country</dt>
                  <dd>{savedJobAnalysisDraft.location}</dd>
                </div>
                <div>
                  <dt>Work mode</dt>
                  <dd>{savedJobAnalysisDraft.workMode}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{savedJobAnalysisDraft.notes || "None"}</dd>
                </div>
              </dl>
              <button
                className="danger-button"
                type="button"
                onClick={handleClearJobAnalysis}
              >
                Clear Saved Job Analysis
              </button>
            </>
          ) : (
            <p className="empty-state">No saved job analysis yet.</p>
          )}
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
                className={getStatusClassName(contentStatus)}
                ref={contentStatusRef}
                role="status"
                tabIndex={-1}
              >
                {contentStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "application-content-view" ? (
        <section className="panel-section">
          <h2>View Content</h2>

          {savedApplicationContentDraft ? (
            <>
              <dl className="profile-summary">
                <div>
                  <dt>Cover letter</dt>
                  <dd>{savedApplicationContentDraft.coverLetter}</dd>
                </div>
                <div>
                  <dt>Profile summary</dt>
                  <dd>{savedApplicationContentDraft.profileSummary}</dd>
                </div>
                <div>
                  <dt>Motivation answer</dt>
                  <dd>{savedApplicationContentDraft.motivationAnswer}</dd>
                </div>
                <div>
                  <dt>Strengths answer</dt>
                  <dd>
                    {savedApplicationContentDraft.strengthsAnswer || "None"}
                  </dd>
                </div>
                <div>
                  <dt>Availability answer</dt>
                  <dd>
                    {savedApplicationContentDraft.availabilityAnswer || "None"}
                  </dd>
                </div>
              </dl>
              <button
                className="danger-button"
                type="button"
                onClick={handleClearApplicationContent}
              >
                Clear Saved Content
              </button>
            </>
          ) : (
            <p className="empty-state">No saved application content yet.</p>
          )}
        </section>
      ) : activeSection === "tracker" ? (
        <section className="panel-section">
          <h2>Tracker</h2>

          <div className="form-grid">
            <button type="button" onClick={handleImportCurrentJobPage}>
              Import Current Job Page
            </button>

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
                className={getStatusClassName(trackerStatus)}
                ref={trackerStatusRef}
                role="status"
                tabIndex={-1}
              >
                {trackerStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "tracker-view" ? (
        <section className="panel-section">
          <h2>View Tracker</h2>

          {savedTrackerDraft ? (
            <>
              <dl className="profile-summary">
                <div>
                  <dt>Role title</dt>
                  <dd>{savedTrackerDraft.roleTitle}</dd>
                </div>
                <div>
                  <dt>Company</dt>
                  <dd>{savedTrackerDraft.company}</dd>
                </div>
                <div>
                  <dt>Application URL</dt>
                  <dd>
                    <a
                      href={savedTrackerDraft.applicationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {savedTrackerDraft.applicationUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{savedTrackerDraft.status}</dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>{savedTrackerDraft.nextAction}</dd>
                </div>
                <div>
                  <dt>Next action date</dt>
                  <dd>{savedTrackerDraft.nextActionDate}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{savedTrackerDraft.notes || "None"}</dd>
                </div>
              </dl>
              <button
                className="danger-button"
                type="button"
                onClick={handleClearTracker}
              >
                Clear Saved Tracker
              </button>
            </>
          ) : (
            <p className="empty-state">No saved tracker draft yet.</p>
          )}
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
