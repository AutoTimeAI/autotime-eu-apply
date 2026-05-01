import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import { countryOptions } from "../lib/countries"
import {
  formatJobPageNotes,
  inferJobPageDetails
} from "../lib/job-page"
import { inferJobFitAnalysis } from "../lib/job-analysis"
import {
  applicationsToCsv,
  filterApplications,
  hasApplicationWithUrl,
  type ApplicationStatusFilter
} from "../lib/applications"
import {
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearProfile,
  clearReusableAnswers,
  clearTrackerDraft,
  deleteApplication,
  getApplications,
  getApplicationContentDraft,
  getJobAnalysisDraft,
  getProfile,
  getReusableAnswers,
  getTrackerDraft,
  saveApplication,
  saveApplicationContentDraft,
  saveJobAnalysisDraft,
  saveProfile,
  saveReusableAnswers,
  saveTrackerDraft,
  updateApplication,
  type ApplicationStatus,
  type ApplicationRecord,
  type ApplicationContentDraft,
  type CandidateProfile,
  type JobAnalysisDraft,
  type ReusableAnswers,
  type TrackerDraft
} from "../lib/storage"
import {
  applicationStatuses,
  emptyApplicationContentDraft,
  emptyJobAnalysisDraft,
  emptyProfile,
  emptyReusableAnswers,
  emptyTrackerDraft,
  noticePeriodOptions,
  type Section
} from "./constants"
import { ApplicationsSection } from "./ApplicationsSection"
import { SectionNav } from "./SectionNav"
import {
  ApplicationContentView,
  JobAnalysisView,
  ProfileView,
  ReusableAnswersView,
  TrackerView
} from "./SavedViews"
import type { AutofillResponse, JobPageResponse, SaveAttempts } from "./types"
import {
  getHostname,
  getStatusClassName,
  normalizeApplicationUrl
} from "./utils"
import {
  getApplicationContentIssueForField,
  getIssueForField,
  getJobIssueForField,
  getReusableAnswerIssueForField,
  getTrackerIssueForField,
  validateApplicationContentDraft,
  validateJobAnalysisDraft,
  validateProfile,
  validateReusableAnswers,
  validateTrackerDraft
} from "../lib/validation"

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [saveAttempts, setSaveAttempts] = useState<SaveAttempts>({
    profile: false,
    "profile-view": false,
    "reusable-answers": false,
    "reusable-answers-view": false,
    "job-analysis": false,
    "job-analysis-view": false,
    "application-content": false,
    "application-content-view": false,
    tracker: false,
    "tracker-view": false,
    applications: false
  })
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [savedProfile, setSavedProfile] = useState<CandidateProfile | null>(
    null
  )
  const [reusableAnswers, setReusableAnswers] =
    useState<ReusableAnswers>(emptyReusableAnswers)
  const [savedReusableAnswers, setSavedReusableAnswers] =
    useState<ReusableAnswers | null>(null)
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
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("")
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useState<ApplicationStatusFilter>("all")
  const [status, setStatus] = useState("")
  const [reusableStatus, setReusableStatus] = useState("")
  const [jobStatus, setJobStatus] = useState("")
  const [contentStatus, setContentStatus] = useState("")
  const [trackerStatus, setTrackerStatus] = useState("")
  const [applicationsStatus, setApplicationsStatus] = useState("")
  const profileStatusRef = useRef<HTMLParagraphElement | null>(null)
  const reusableStatusRef = useRef<HTMLParagraphElement | null>(null)
  const jobStatusRef = useRef<HTMLParagraphElement | null>(null)
  const contentStatusRef = useRef<HTMLParagraphElement | null>(null)
  const trackerStatusRef = useRef<HTMLParagraphElement | null>(null)
  const applicationsStatusRef = useRef<HTMLParagraphElement | null>(null)

  const profileIssues = useMemo(() => validateProfile(profile), [profile])
  const jobAnalysisIssues = useMemo(
    () => validateJobAnalysisDraft(jobAnalysisDraft),
    [jobAnalysisDraft]
  )
  const applicationContentIssues = useMemo(
    () => validateApplicationContentDraft(applicationContentDraft),
    [applicationContentDraft]
  )
  const reusableAnswerIssues = useMemo(
    () => validateReusableAnswers(reusableAnswers),
    [reusableAnswers]
  )
  const trackerIssues = useMemo(
    () => validateTrackerDraft(trackerDraft),
    [trackerDraft]
  )
  const visibleApplications = useMemo(
    () =>
      filterApplications(
        applications,
        applicationSearchQuery,
        applicationStatusFilter
      ),
    [applications, applicationSearchQuery, applicationStatusFilter]
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
      "reusable-answers": false,
      "reusable-answers-view": false,
      "job-analysis": false,
      "job-analysis-view": false,
      "application-content": false,
      "application-content-view": false,
      tracker: false,
      "tracker-view": false,
      applications: false
    })
    setStatus("")
    setReusableStatus("")
    setJobStatus("")
    setContentStatus("")
    setTrackerStatus("")
    setApplicationsStatus("")
  }

  const loadApplications = async () => {
    const savedApplications = await getApplications()
    setApplications(savedApplications)
  }

  useEffect(() => {
    const loadProfile = async () => {
      const savedProfile = await getProfile()
      if (savedProfile) {
        setSavedProfile(savedProfile)
      }

      const savedReusableAnswers = await getReusableAnswers()
      if (savedReusableAnswers) {
        setSavedReusableAnswers(savedReusableAnswers)
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

      await loadApplications()
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const statusRefs: Record<Section, HTMLParagraphElement | null> = {
      profile: profileStatusRef.current,
      "profile-view": null,
      "reusable-answers": reusableStatusRef.current,
      "reusable-answers-view": null,
      "job-analysis": jobStatusRef.current,
      "job-analysis-view": null,
      "application-content": contentStatusRef.current,
      "application-content-view": null,
      tracker: trackerStatusRef.current,
      "tracker-view": null,
      applications: applicationsStatusRef.current
    }

    const activeStatus = {
      profile: status,
      "profile-view": "",
      "reusable-answers": reusableStatus,
      "reusable-answers-view": "",
      "job-analysis": jobStatus,
      "job-analysis-view": "",
      "application-content": contentStatus,
      "application-content-view": "",
      tracker: trackerStatus,
      "tracker-view": "",
      applications: applicationsStatus
    }[activeSection]

    const statusElement = statusRefs[activeSection]

    if (!activeStatus || !statusElement) {
      return
    }

    statusElement.scrollIntoView({ behavior: "smooth", block: "center" })
    statusElement.focus({ preventScroll: true })
  }, [
    activeSection,
    status,
    reusableStatus,
    jobStatus,
    contentStatus,
    trackerStatus,
    applicationsStatus
  ])

  const updateField = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const updateReusableAnswer = <K extends keyof ReusableAnswers>(
    key: K,
    value: ReusableAnswers[K]
  ) => {
    setReusableAnswers((current) => ({ ...current, [key]: value }))
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

  const updateSavedApplication = async (
    id: string,
    changes: Partial<
      Pick<
        ApplicationRecord,
        | "company"
        | "nextAction"
        | "nextActionDate"
        | "notes"
        | "roleTitle"
        | "source"
        | "status"
      >
    >
  ) => {
    await updateApplication(id, changes)
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, ...changes } : application
      )
    )
  }

  const deleteSavedApplication = async (id: string) => {
    await deleteApplication(id)
    setApplications((current) =>
      current.filter((application) => application.id !== id)
    )
    setApplicationsStatus("Application deleted")
    setTimeout(() => setApplicationsStatus(""), 2500)
  }

  const saveCurrentTabAsApplication = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.url || !activeTab.title) {
      setApplicationsStatus("Could not read current tab")
      setTimeout(() => setApplicationsStatus(""), 2500)
      return
    }

    if (hasApplicationWithUrl(applications, activeTab.url)) {
      setApplicationsStatus("This application is already saved")
      setTimeout(() => setApplicationsStatus(""), 2500)
      return
    }

    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      title: activeTab.title,
      roleTitle: activeTab.title,
      url: activeTab.url,
      source: getHostname(activeTab.url),
      createdAt: new Date().toISOString(),
      status: "draft"
    }

    await saveApplication(record)
    setApplications((current) => [record, ...current])
    setApplicationsStatus("Application draft saved")
    setTimeout(() => setApplicationsStatus(""), 2500)
  }

  const exportApplications = () => {
    if (applications.length === 0) {
      setApplicationsStatus("No applications to export")
      setTimeout(() => setApplicationsStatus(""), 2500)
      return
    }

    const csv = applicationsToCsv(applications)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-applications.csv"
    link.click()
    URL.revokeObjectURL(url)

    setApplicationsStatus("Applications exported")
    setTimeout(() => setApplicationsStatus(""), 2500)
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

  const handleAutofillCurrentPage = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.id) {
      setStatus("Could not access current tab")
      setTimeout(() => setStatus(""), 2500)
      return
    }

    try {
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_AUTOFILL_PROFILE"
      })) as AutofillResponse

      if (response.message) {
        setStatus(response.message)
      } else if (response.filledFields.length === 0) {
        setStatus("No obvious empty fields found")
      } else {
        setStatus(`Filled ${response.filledFields.length} fields`)
      }
    } catch {
      setStatus("Autofill is not available on this page")
    }

    setTimeout(() => setStatus(""), 2500)
  }

  const handleSaveReusableAnswers = async () => {
    markSaveAttempted("reusable-answers")

    if (reusableAnswerIssues.length > 0) {
      setReusableStatus(
        "Complete the highlighted reusable answer fields before saving."
      )
      return
    }

    await saveReusableAnswers(reusableAnswers)
    setSavedReusableAnswers(reusableAnswers)
    setReusableAnswers(emptyReusableAnswers)
    clearSaveAttempt("reusable-answers")
    setReusableStatus("Reusable answers saved")
    setTimeout(() => setReusableStatus(""), 3500)
  }

  const handleSaveJobAnalysis = async () => {
    markSaveAttempted("job-analysis")

    if (jobAnalysisIssues.length > 0) {
      setJobStatus(
        "Complete the highlighted job analysis fields before saving."
      )
      return
    }

    const analysis = inferJobFitAnalysis(jobAnalysisDraft, savedProfile)
    const analysedDraft = { ...jobAnalysisDraft, ...analysis }

    await saveJobAnalysisDraft(analysedDraft)
    setSavedJobAnalysisDraft(analysedDraft)
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
    await loadApplications()
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

  const handleClearReusableAnswers = async () => {
    await clearReusableAnswers()
    setSavedReusableAnswers(null)
    setReusableAnswers(emptyReusableAnswers)
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

      <SectionNav
        activeSection={activeSection}
        applicationContentIssueCount={applicationContentIssues.length}
        jobAnalysisIssueCount={jobAnalysisIssues.length}
        onSectionChange={goToSection}
        profileIssueCount={profileIssues.length}
        reusableAnswerIssueCount={reusableAnswerIssues.length}
        saveAttempts={saveAttempts}
        trackerIssueCount={trackerIssues.length}
      />

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

            <button type="button" onClick={handleAutofillCurrentPage}>
              Autofill Current Page
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
        <ProfileView draft={savedProfile} onClear={handleClearProfile} />
      ) : activeSection === "reusable-answers" ? (
        <section className="panel-section">
          <h2>Reusable Answers</h2>

          <div className="form-grid">
            {saveAttempts["reusable-answers"] &&
              reusableAnswerIssues.length > 0 && (
                <div className="alert-panel" role="alert">
                  <strong>Reusable Answers need attention</strong>
                  <ul>
                    {reusableAnswerIssues.map((issue) => (
                      <li key={`${issue.field}-${issue.message}`}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <label>
              Sponsorship answer
              {saveAttempts["reusable-answers"] &&
                getReusableAnswerIssueForField(
                  reusableAnswerIssues,
                  "sponsorshipAnswer"
                ) && (
                  <span className="field-alert">
                    {getReusableAnswerIssueForField(
                      reusableAnswerIssues,
                      "sponsorshipAnswer"
                    )}
                  </span>
                )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["reusable-answers"] &&
                  getReusableAnswerIssueForField(
                    reusableAnswerIssues,
                    "sponsorshipAnswer"
                  )
                )}
                value={reusableAnswers.sponsorshipAnswer}
                onChange={(event) =>
                  updateReusableAnswer("sponsorshipAnswer", event.target.value)
                }
              />
            </label>

            <label>
              Relocation answer
              {saveAttempts["reusable-answers"] &&
                getReusableAnswerIssueForField(
                  reusableAnswerIssues,
                  "relocationAnswer"
                ) && (
                  <span className="field-alert">
                    {getReusableAnswerIssueForField(
                      reusableAnswerIssues,
                      "relocationAnswer"
                    )}
                  </span>
                )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["reusable-answers"] &&
                  getReusableAnswerIssueForField(
                    reusableAnswerIssues,
                    "relocationAnswer"
                  )
                )}
                value={reusableAnswers.relocationAnswer}
                onChange={(event) =>
                  updateReusableAnswer("relocationAnswer", event.target.value)
                }
              />
            </label>

            <label>
              Work authorisation answer
              {saveAttempts["reusable-answers"] &&
                getReusableAnswerIssueForField(
                  reusableAnswerIssues,
                  "workAuthorisationAnswer"
                ) && (
                  <span className="field-alert">
                    {getReusableAnswerIssueForField(
                      reusableAnswerIssues,
                      "workAuthorisationAnswer"
                    )}
                  </span>
                )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["reusable-answers"] &&
                  getReusableAnswerIssueForField(
                    reusableAnswerIssues,
                    "workAuthorisationAnswer"
                  )
                )}
                value={reusableAnswers.workAuthorisationAnswer}
                onChange={(event) =>
                  updateReusableAnswer(
                    "workAuthorisationAnswer",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Notice period answer
              {saveAttempts["reusable-answers"] &&
                getReusableAnswerIssueForField(
                  reusableAnswerIssues,
                  "noticePeriodAnswer"
                ) && (
                  <span className="field-alert">
                    {getReusableAnswerIssueForField(
                      reusableAnswerIssues,
                      "noticePeriodAnswer"
                    )}
                  </span>
                )}
              <textarea
                aria-invalid={Boolean(
                  saveAttempts["reusable-answers"] &&
                  getReusableAnswerIssueForField(
                    reusableAnswerIssues,
                    "noticePeriodAnswer"
                  )
                )}
                value={reusableAnswers.noticePeriodAnswer}
                onChange={(event) =>
                  updateReusableAnswer("noticePeriodAnswer", event.target.value)
                }
              />
            </label>

            <button type="button" onClick={handleSaveReusableAnswers}>
              Save Reusable Answers
            </button>

            {reusableStatus && (
              <p
                className={getStatusClassName(reusableStatus)}
                ref={reusableStatusRef}
                role="status"
                tabIndex={-1}
              >
                {reusableStatus}
              </p>
            )}
          </div>
        </section>
      ) : activeSection === "reusable-answers-view" ? (
        <ReusableAnswersView
          draft={savedReusableAnswers}
          onClear={handleClearReusableAnswers}
        />
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
        <JobAnalysisView
          draft={savedJobAnalysisDraft}
          onClear={handleClearJobAnalysis}
        />
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
        <ApplicationContentView
          draft={savedApplicationContentDraft}
          onClear={handleClearApplicationContent}
        />
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
        <TrackerView draft={savedTrackerDraft} onClear={handleClearTracker} />
      ) : activeSection === "applications" ? (
        <ApplicationsSection
          applications={applications}
          searchQuery={applicationSearchQuery}
          status={applicationsStatus}
          statusFilter={applicationStatusFilter}
          statusRef={applicationsStatusRef}
          visibleApplications={visibleApplications}
          onDeleteApplication={deleteSavedApplication}
          onExportApplications={exportApplications}
          onSaveCurrentTab={saveCurrentTabAsApplication}
          onSearchQueryChange={setApplicationSearchQuery}
          onStatusFilterChange={setApplicationStatusFilter}
          onUpdateApplication={updateSavedApplication}
        />
      ) : (
        <section className="panel-section">
          <h2>AutoTime EU Apply</h2>
        </section>
      )}
    </main>
  )
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <SidePanelApp />
)
