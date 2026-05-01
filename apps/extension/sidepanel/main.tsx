import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
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
  type ApplicationRecord,
  type ApplicationContentSnapshot,
  type ApplicationContentDraft,
  type CandidateProfile,
  type JobAnalysisDraft,
  type ReusableAnswers,
  type TrackerDraft
} from "../lib/storage"
import {
  emptyApplicationContentDraft,
  emptyJobAnalysisDraft,
  emptyProfile,
  emptyReusableAnswers,
  emptyTrackerDraft,
  type Section
} from "./constants"
import { ApplicationsSection } from "./ApplicationsSection"
import { ApplicationContentSection } from "./ApplicationContentSection"
import { JobAnalysisSection } from "./JobAnalysisSection"
import { ProfileSection } from "./ProfileSection"
import { ReusableAnswersSection } from "./ReusableAnswersSection"
import { SectionNav } from "./SectionNav"
import {
  ApplicationContentView,
  JobAnalysisView,
  ProfileView,
  ReusableAnswersView,
  TrackerView
} from "./SavedViews"
import { TrackerSection } from "./TrackerSection"
import type { AutofillResponse, JobPageResponse, SaveAttempts } from "./types"
import { getHostname, normalizeApplicationUrl } from "./utils"
import {
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
      status: "Saved"
    }

    await saveApplication(record)
    setApplications((current) => [record, ...current])
    setApplicationsStatus("Application saved")
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
      notes: draft.notes,
      contentSnapshot: draft.contentSnapshot
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

  const createContentSnapshot = (
    draft: ApplicationContentDraft | null
  ): ApplicationContentSnapshot | undefined => {
    if (!draft) {
      return undefined
    }

    return {
      ...draft,
      savedAt: new Date().toISOString()
    }
  }

  const handleSaveTracker = async () => {
    markSaveAttempted("tracker")

    if (trackerIssues.length > 0) {
      setTrackerStatus("Complete the highlighted tracker fields before saving.")
      return
    }

    const draftWithSnapshot: TrackerDraft = {
      ...trackerDraft,
      contentSnapshot: createContentSnapshot(savedApplicationContentDraft)
    }

    await saveTrackerDraft(draftWithSnapshot)
    await saveTrackerApplication(draftWithSnapshot)
    await loadApplications()
    setSavedTrackerDraft(draftWithSnapshot)
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
        <ProfileSection
          issues={profileIssues}
          onAutofillCurrentPage={handleAutofillCurrentPage}
          onFieldChange={updateField}
          onSave={handleSaveProfile}
          profile={profile}
          saveAttempted={saveAttempts.profile}
          status={status}
          statusRef={profileStatusRef}
        />
      ) : activeSection === "profile-view" ? (
        <ProfileView draft={savedProfile} onClear={handleClearProfile} />
      ) : activeSection === "reusable-answers" ? (
        <ReusableAnswersSection
          answers={reusableAnswers}
          issues={reusableAnswerIssues}
          onFieldChange={updateReusableAnswer}
          onSave={handleSaveReusableAnswers}
          saveAttempted={saveAttempts["reusable-answers"]}
          status={reusableStatus}
          statusRef={reusableStatusRef}
        />
      ) : activeSection === "reusable-answers-view" ? (
        <ReusableAnswersView
          draft={savedReusableAnswers}
          onClear={handleClearReusableAnswers}
        />
      ) : activeSection === "job-analysis" ? (
        <JobAnalysisSection
          draft={jobAnalysisDraft}
          issues={jobAnalysisIssues}
          onFieldChange={updateJobAnalysisField}
          onSave={handleSaveJobAnalysis}
          saveAttempted={saveAttempts["job-analysis"]}
          status={jobStatus}
          statusRef={jobStatusRef}
        />
      ) : activeSection === "job-analysis-view" ? (
        <JobAnalysisView
          draft={savedJobAnalysisDraft}
          onClear={handleClearJobAnalysis}
        />
      ) : activeSection === "application-content" ? (
        <ApplicationContentSection
          draft={applicationContentDraft}
          issues={applicationContentIssues}
          onFieldChange={updateApplicationContentField}
          onSave={handleSaveApplicationContent}
          saveAttempted={saveAttempts["application-content"]}
          status={contentStatus}
          statusRef={contentStatusRef}
        />
      ) : activeSection === "application-content-view" ? (
        <ApplicationContentView
          draft={savedApplicationContentDraft}
          onClear={handleClearApplicationContent}
        />
      ) : activeSection === "tracker" ? (
        <TrackerSection
          draft={trackerDraft}
          issues={trackerIssues}
          onFieldChange={updateTrackerField}
          onImportCurrentJobPage={handleImportCurrentJobPage}
          onSave={handleSaveTracker}
          saveAttempted={saveAttempts.tracker}
          status={trackerStatus}
          statusRef={trackerStatusRef}
        />
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
