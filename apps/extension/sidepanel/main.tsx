// Entry point for the extension's side panel (registered as the sidepanel
// page in wxt.config.ts's build output). Renders `<SidePanelApp>`, which
// owns essentially all side panel state: the currently detected/tracked
// job on the active tab, the account session and its dashboard sync
// (queued through lib/session.ts + lib/cloud-sync.ts, with local-first
// fallback via lib/storage.ts when offline or signed out), and the
// editable drafts for every feature (profile, reusable answers, job
// analysis, application content, tracker). Talks to the active tab's
// content script via chrome.tabs.sendMessage/chrome.scripting.executeScript
// (see `ensureContentScriptReady`) using the same AUTOTIME_* message
// contract defined in contents/autofill.ts and entrypoints/background/index.ts.
//
// Note: `renderLegacyTools` below is currently `false`, so the actual
// rendered UI is just the "Track Job" panel plus account badge and sync
// diagnostics - the full multi-section layout (SectionNav + all the
// ProfileSection/JobAnalysisSection/etc. components) is built and wired up
// but not shown. Keep that in mind when reading this file: most of its
// handlers exist to serve UI that isn't currently on screen.
import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  formatJobPageNotes,
  inferJobPageDetails
} from "../lib/job-page"
import { generateApplicationContentDraft } from "../lib/content-generation"
import {
  applicationsToCsv,
  filterApplications,
  getApplicationValidationMetrics,
  hasApplicationWithUrl,
  normalizeApplicationUrl as normalizeApplicationUrlKey,
  validationMetricsToCsv,
  type ApplicationStatusFilter
} from "../lib/applications"
import {
  clearAIUsageLog,
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearAccountSession,
  clearDiagnosticLog,
  clearLegacyOpenAISettings,
  clearProfile,
  clearReusableAnswers,
  clearTrackerDraft,
  deleteApplication,
  getAIUsageLog,
  getApplicationSyncState,
  getApplications,
  getApplicationContentDraft,
  getDiagnosticLog,
  getJobAnalysisDraft,
  getProfile,
  getReusableAnswers,
  getTrackerDraft,
  saveApplication,
  saveApplicationContentDraft,
  saveProfile,
  saveReusableAnswers,
  saveTrackerDraft,
  logAIUsage,
  logDiagnosticEvent,
  type AIUsageLogEntry,
  type ApplicationSyncState,
  type DiagnosticLogEntry,
  updateApplication,
  updateApplicationSyncState,
  type AccountSession,
  type ApplicationRecord,
  type ApplicationContentSnapshot,
  type ApplicationContentDraft,
  type CandidateProfile,
  type ReusableAnswers,
  type TrackerDraft
} from "../lib/storage"
import {
  appUrl,
  generateAIApplicationContentDraft,
  getOpenAIErrorMessage
} from "../lib/openai"
import {
  loadProfileFromDashboard,
  syncApplicationsToDashboard,
  syncProfileToDashboard
} from "../lib/cloud-sync"
import { getActiveSession, withFreshSession } from "../lib/session"
import {
  createV2DashboardState,
  v2DashboardStateToJson
} from "../lib/v2-dashboard"
import { getCandidateProfileBridgeIssues } from "shared"
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
import { AccountSection } from "./AccountSection"
import { JobAnalysisSection } from "./JobAnalysisSection"
import { Onboarding } from "./Onboarding"
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
import { UsageLogSection } from "./UsageLogSection"
import { ValidationMetricsSection } from "./ValidationMetricsSection"
import type { AutofillResponse, JobPageResponse, SaveAttempts } from "./types"
import { useJobAnalysis } from "./useJobAnalysis"
import { formatProviderLabel, getHostname, getStatusClassName, normalizeApplicationUrl } from "./utils"
import {
  validateApplicationContentDraft,
  validateProfile,
  validateReusableAnswers,
  validateTrackerDraft
} from "../lib/validation"

const insightKeywords = [
  "python",
  "openai",
  "anthropic",
  "llm",
  "rag",
  "nlp",
  "api",
  "document",
  "financial",
  "dashboard",
  "data",
  "analysis",
  "modelling",
  "legal",
  "risk",
  "market"
]

const noJobDescriptionMessage =
  "No job description found. Update your description and click the button below to retrieve insights."

function getWordCount(text = "") {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function getDetectedKeywords(description = "") {
  const normalized = description.toLowerCase()

  return insightKeywords
    .filter((keyword) => normalized.includes(keyword))
    .slice(0, 6)
}

function getBasicInsights(details: JobPageResponse | null) {
  if (!details?.jobDescription.trim()) {
    return [noJobDescriptionMessage]
  }

  const wordCount = getWordCount(details.jobDescription)
  const keywords = getDetectedKeywords(details.jobDescription)

  return [
    details.platform !== "Generic"
      ? `Detected from ${details.platform}.`
      : "Detected from the current job page.",
    `${wordCount} words in the visible job description.`,
    details.location
      ? `Location signal: ${details.location}.`
      : "Location was not clearly detected.",
    keywords.length > 0
      ? `Core signals: ${keywords.join(", ")}.`
      : "No keyword signals detected yet."
  ]
}

function getDeepInsights(details: JobPageResponse | null) {
  if (!details) {
    return [
      "Role positioning angle",
      "Evidence gaps against the job description",
      "Application risk and priority recommendation"
    ]
  }

  const keywords = getDetectedKeywords(details.jobDescription)
  const role = details.roleTitle || "this role"
  const company = details.company || "the company"

  return [
    `Position ${role} around ${keywords[0] ?? "the strongest repeated job signal"}.`,
    `Prepare evidence for ${keywords.slice(0, 3).join(", ") || "the top requirements"} before applying.`,
    `Review ${company} fit, location and work-right risk in the dashboard before sending materials.`
  ]
}

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("applications")
  const [isTrackingJob, setIsTrackingJob] = useState(false)
  const [trackedJobDetails, setTrackedJobDetails] =
    useState<JobPageResponse | null>(null)
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
    applications: false,
    "usage-log": false,
    "validation-metrics": false,
    account: false
  })
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [savedProfile, setSavedProfile] = useState<CandidateProfile | null>(
    null
  )
  const [reusableAnswers, setReusableAnswers] =
    useState<ReusableAnswers>(emptyReusableAnswers)
  const [savedReusableAnswers, setSavedReusableAnswers] =
    useState<ReusableAnswers | null>(null)
  const [applicationContentDraft, setApplicationContentDraft] =
    useState<ApplicationContentDraft>(emptyApplicationContentDraft)
  const [savedApplicationContentDraft, setSavedApplicationContentDraft] =
    useState<ApplicationContentDraft | null>(null)
  const [trackerDraft, setTrackerDraft] =
    useState<TrackerDraft>(emptyTrackerDraft)
  const [savedTrackerDraft, setSavedTrackerDraft] =
    useState<TrackerDraft | null>(null)
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [applicationSyncState, setApplicationSyncState] = useState<
    Record<string, ApplicationSyncState>
  >({})
  const [aiUsageLog, setAIUsageLog] = useState<AIUsageLogEntry[]>([])
  const [diagnosticLog, setDiagnosticLog] = useState<DiagnosticLogEntry[]>([])
  const [accountSession, setAccountSession] = useState<AccountSession | null>(
    null
  )
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("")
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useState<ApplicationStatusFilter>("all")
  const [status, setStatus] = useState("")
  const [reusableStatus, setReusableStatus] = useState("")
  const [contentStatus, setContentStatus] = useState("")
  const [trackerStatus, setTrackerStatus] = useState("")
  const [applicationsStatus, setApplicationsStatus] = useState("")
  const [usageLogStatus, setUsageLogStatus] = useState("")
  const [accountStatus, setAccountStatus] = useState("")
  const profileStatusRef = useRef<HTMLParagraphElement | null>(null)
  const reusableStatusRef = useRef<HTMLParagraphElement | null>(null)
  const contentStatusRef = useRef<HTMLParagraphElement | null>(null)
  const trackerStatusRef = useRef<HTMLParagraphElement | null>(null)
  const applicationsStatusRef = useRef<HTMLParagraphElement | null>(null)
  const usageLogStatusRef = useRef<HTMLParagraphElement | null>(null)
  const accountStatusRef = useRef<HTMLParagraphElement | null>(null)

  const profileIssues = useMemo(() => validateProfile(profile), [profile])
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
  const validationMetrics = useMemo(
    () => getApplicationValidationMetrics(applications),
    [applications]
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
      applications: false,
      "usage-log": false,
      "validation-metrics": false,
      account: false
    })
    setStatus("")
    setReusableStatus("")
    setJobStatus("")
    setContentStatus("")
    setTrackerStatus("")
    setApplicationsStatus("")
    setUsageLogStatus("")
    setAccountStatus("")
  }

  const loadApplications = async () => {
    const savedApplications = await getApplications()
    setApplications(savedApplications)
    setApplicationSyncState(await getApplicationSyncState())
  }

  const loadAIUsageLog = async () => {
    const savedUsageLog = await getAIUsageLog()
    setAIUsageLog(savedUsageLog)
  }

  const loadDiagnosticLog = async () => {
    setDiagnosticLog(await getDiagnosticLog())
  }

  const loadAccountSession = async () => {
    await clearLegacyOpenAISettings()
    const { session } = await getActiveSession()
    setAccountSession(session)
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
      await loadAIUsageLog()
      await loadDiagnosticLog()
      await loadAccountSession()
    }

    loadProfile()

    const refreshAccountSession = () => {
      void loadAccountSession()
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "session" && changes["account-session"]) {
        refreshAccountSession()
      }

      if (areaName === "local" && changes["diagnostic-log"]) {
        void loadDiagnosticLog()
      }

      if (
        areaName === "local" &&
        (changes["application-sync-state"] || changes["saved-applications"])
      ) {
        void loadApplications()
      }
    }

    window.addEventListener("focus", refreshAccountSession)
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      window.removeEventListener("focus", refreshAccountSession)
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

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

  const authToken = accountSession?.authToken ?? null
  const canUseBackendAI = () => Boolean(authToken?.trim())
  const getBackendAISkipMessage = () =>
    canUseBackendAI()
      ? ""
      : "Sign in to use AutoTime AI. Used local fallback."

  const {
    handleImportCurrentJobPageForAnalysis,
    handleSaveJobAnalysis,
    jobAnalysisDraft,
    jobAnalysisIssues,
    jobStatus,
    jobStatusRef,
    savedJobAnalysisDraft,
    setJobAnalysisDraft,
    setJobStatus,
    setSavedJobAnalysisDraft,
    updateJobAnalysisField
  } = useJobAnalysis({
    authToken,
    canUseBackendAI,
    clearSaveAttempt,
    getBackendAISkipMessage,
    markSaveAttempted,
    savedProfile,
    setAIUsageLog
  })

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
      applications: applicationsStatusRef.current,
      "usage-log": usageLogStatusRef.current,
      "validation-metrics": null,
      account: accountStatusRef.current
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
      applications: applicationsStatus,
      "usage-log": usageLogStatus,
      "validation-metrics": "",
      account: accountStatus
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
    applicationsStatus,
    usageLogStatus,
    accountStatus,
    jobStatusRef
  ])

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

  const ensureContentScriptReady = async (tabId: number) => {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "AUTOTIME_DETECT_JOB_PAGE"
      })
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-scripts/autotime.js"]
      })
    }

    await chrome.tabs.sendMessage(tabId, {
      type: "AUTOTIME_SHOW_WIDGET"
    })
  }

  const detectJobPageFromTab = async (
    activeTab: chrome.tabs.Tab
  ): Promise<JobPageResponse | null> => {
    if (!activeTab.id) {
      return activeTab.url || activeTab.title
        ? inferJobPageDetails({
            title: activeTab.title,
            url: activeTab.url
          })
        : null
    }

    try {
      await ensureContentScriptReady(activeTab.id)
      return (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_DETECT_JOB_PAGE"
      })) as JobPageResponse
    } catch {
      if (!activeTab.url && !activeTab.title) {
        return null
      }

      return inferJobPageDetails({
        title: activeTab.title,
        url: activeTab.url
      })
    }
  }

  const getCurrentTabApplicationDetails = async (
    activeTab: chrome.tabs.Tab
  ) => {
    return detectJobPageFromTab(activeTab)
  }

  const syncApplicationListToDashboard = async (
    applicationsToSync: ApplicationRecord[],
    options: { resurrectUrlKey?: string } = {}
  ) => {
    const applicationIds = applicationsToSync.map((application) => application.id)
    const { session: activeSession, warning: sessionWarning } =
      await getActiveSession()

    if (activeSession?.authToken !== accountSession?.authToken) {
      setAccountSession(activeSession)
    }

    if (!activeSession?.authToken.trim()) {
      await updateApplicationSyncState(applicationIds, "failed", {
        error: sessionWarning ?? "Sign in to sync to dashboard."
      })
      setApplicationSyncState(await getApplicationSyncState())
      await logDiagnosticEvent({
        area: "sync",
        event: "track-job-sync-skipped-unconnected",
        message: sessionWarning ?? "Sign in to sync to dashboard.",
        status: "warning",
        details: { applicationCount: applicationsToSync.length }
      })
      return {
        reason: sessionWarning ?? "Saved locally only. Sign in to sync to dashboard.",
        synced: false
      }
    }

    await updateApplicationSyncState(applicationIds, "pending")
    setApplicationSyncState(await getApplicationSyncState())

    try {
      const { result: syncResult, session: usedSession, error: retryError } =
        await withFreshSession((session) =>
          syncApplicationsToDashboard({
            applications: applicationsToSync,
            resurrectUrlKeys: options.resurrectUrlKey
              ? [options.resurrectUrlKey]
              : undefined,
            session
          })
        )

      if (usedSession && usedSession.authToken !== accountSession?.authToken) {
        setAccountSession(usedSession)
      }

      if (!syncResult) {
        throw new Error(retryError ?? "Dashboard sync failed")
      }

      const deletedApplicationIds = syncResult.deletedApplicationIds ?? []
      const syncedApplicationIds = applicationIds.filter(
        (id) => !deletedApplicationIds.includes(id)
      )

      await Promise.all(
        deletedApplicationIds.map((id) => deleteApplication(id))
      )

      if (syncedApplicationIds.length) {
        await updateApplicationSyncState(syncedApplicationIds, "synced")
      }
      if (deletedApplicationIds.length) {
        setApplications(await getApplications())
      }
      setApplicationSyncState(await getApplicationSyncState())
      await logDiagnosticEvent({
        area: "sync",
        event: "track-job-sync-completed",
        message: "Tracked jobs synced to the cloud-backed dashboard.",
        status: "success",
        details: { applicationCount: syncedApplicationIds.length }
      })
      return { synced: true }
    } catch (error: unknown) {
      const reason =
        error instanceof Error ? error.message : "Dashboard sync failed"
      await updateApplicationSyncState(applicationIds, "failed", { error: reason })
      setApplicationSyncState(await getApplicationSyncState())
      await logDiagnosticEvent({
        area: "sync",
        event: "track-job-sync-failed",
        message: reason,
        status: "warning",
        details: { applicationCount: applicationsToSync.length }
      })
      return {
        reason,
        synced: false
      }
    }
  }

  const retryApplicationSync = async () => {
    if (applications.length === 0) {
      setApplicationsStatus("No applications to sync")
      setTimeout(() => setApplicationsStatus(""), 2500)
      return
    }

    const result = await syncApplicationListToDashboard(applications)
    setApplicationsStatus(
      result.synced
        ? "Tracked jobs are now synced to your dashboard — they'll appear there within a few seconds."
        : `Saved locally only. ${result.reason}`
    )
    setTimeout(() => setApplicationsStatus(""), 6000)
  }

  const saveCurrentTabAsApplication = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]
    const details = activeTab
      ? await getCurrentTabApplicationDetails(activeTab)
      : null

    if (!details?.url) {
      setTrackedJobDetails(null)
      setApplicationsStatus(
        "Could not track this tab. Open a visible job page, then try again."
      )
      setTimeout(() => setApplicationsStatus(""), 4500)
      return
    }

    if (hasApplicationWithUrl(applications, details.url)) {
      setTrackedJobDetails(details)
      const syncResult = await syncApplicationListToDashboard(applications, {
        resurrectUrlKey: normalizeApplicationUrlKey(details.url)
      })
      if (syncResult.synced) {
        setApplicationsStatus(
          "This job is already tracked and synced to dashboard — it'll be up to date there within a few seconds."
        )
      } else {
        setApplicationsStatus(
          `This job is saved locally for now. ${syncResult.reason}`
        )
      }
      setTimeout(() => setApplicationsStatus(""), 6000)
      return
    }

    const title = details.roleTitle || details.pageTitle || details.url
    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      title,
      roleTitle: details.roleTitle || title,
      company: details.company || undefined,
      url: details.url,
      source: details.source || getHostname(details.url),
      createdAt: new Date().toISOString(),
      status: "Saved",
      notes: [
        details.jobDescription,
        formatJobPageNotes(details)
      ]
        .filter(Boolean)
        .join("\n\n")
    }

    setTrackedJobDetails(details)
    const updatedApplications = [record, ...applications]
    const syncResult = await syncApplicationListToDashboard(updatedApplications, {
      resurrectUrlKey: normalizeApplicationUrlKey(record.url)
    })

    await saveApplication(record)
    setApplications(updatedApplications)
    setApplicationsStatus(
      syncResult.synced
        ? "Job tracked and synced to dashboard — it'll appear there within a few seconds (the dashboard refreshes automatically while open)."
        : `Job saved locally for now. ${syncResult.reason}`
    )

    setTimeout(() => setApplicationsStatus(""), 6000)
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

  const exportV2Dashboard = () => {
    if (!savedProfile) {
      setApplicationsStatus(
        "Save candidate profile before exporting V2 dashboard JSON"
      )
      setTimeout(() => setApplicationsStatus(""), 3000)
      return
    }

    const profileBridgeIssues = getCandidateProfileBridgeIssues(savedProfile)
    if (profileBridgeIssues.length > 0) {
      setApplicationsStatus(
        `Complete profile bridge fields before export: ${profileBridgeIssues.join(
          ", "
        )}`
      )
      setTimeout(() => setApplicationsStatus(""), 4000)
      return
    }

    const dashboardState = createV2DashboardState({
      applications,
      jobAnalysis: savedJobAnalysisDraft,
      profile: savedProfile,
      reusableAnswers: savedReusableAnswers
    })
    const json = v2DashboardStateToJson(dashboardState)
    const blob = new Blob([json], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-v2-dashboard.json"
    link.click()
    URL.revokeObjectURL(url)

    setApplicationsStatus("V2 dashboard JSON exported")
    setTimeout(() => setApplicationsStatus(""), 2500)
  }

  const exportValidationMetrics = () => {
    const csv = validationMetricsToCsv(validationMetrics)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-validation-metrics.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveProfile = async () => {
    markSaveAttempted("profile")

    if (profileIssues.length > 0) {
      setStatus("Complete the highlighted profile essentials before saving.")
      return
    }

    await saveProfile(profile)
    setSavedProfile(profile)
    setProfile(emptyProfile)
    clearSaveAttempt("profile")
    setStatus("Profile essentials saved")
    setTimeout(() => setStatus(""), 3500)
  }

  const openProfileSetup = () => {
    chrome.tabs.create({ url: `${appUrl}/dashboard` })
  }

  const openExtensionConnect = () => {
    const extensionId = encodeURIComponent(chrome.runtime.id)
    chrome.tabs.create({
      url: `${appUrl}/extension/connect?extensionId=${extensionId}`
    })
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
      await ensureContentScriptReady(activeTab.id)
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
        "Complete or clear the highlighted optional answers before saving."
      )
      return
    }

    await saveReusableAnswers(reusableAnswers)
    setSavedReusableAnswers(reusableAnswers)
    setReusableAnswers(emptyReusableAnswers)
    clearSaveAttempt("reusable-answers")
    setReusableStatus("Optional answers saved")
    setTimeout(() => setReusableStatus(""), 3500)
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

  const handleGenerateApplicationContent = async () => {
    if (!savedProfile || !savedJobAnalysisDraft) {
      setContentStatus("Save a profile and job analysis before generating.")
      setTimeout(() => setContentStatus(""), 3500)
      return
    }

    let generatedDraft = generateApplicationContentDraft(
      savedProfile,
      savedJobAnalysisDraft,
      savedReusableAnswers
    )
    let usedAI = false
    let aiFallbackMessage = getBackendAISkipMessage()

    if (canUseBackendAI()) {
      try {
        const aiContent = await generateAIApplicationContentDraft({
          authToken,
          profile: savedProfile,
          job: savedJobAnalysisDraft,
          reusableAnswers: savedReusableAnswers
        })
        generatedDraft = aiContent.value
        const usageLogEntry = await logAIUsage({
          featureName: "Application content generation",
          model: "web-backend",
          approximateCostUsd: aiContent.approximateCostUsd
        })
        setAIUsageLog((current) => [usageLogEntry, ...current])
        usedAI = true
        aiFallbackMessage = ""
      } catch (error) {
        generatedDraft = generateApplicationContentDraft(
          savedProfile,
          savedJobAnalysisDraft,
          savedReusableAnswers
        )
        aiFallbackMessage = `AutoTime AI failed: ${getOpenAIErrorMessage(
          error
        )} Used local fallback.`
      }
    }

    setApplicationContentDraft(generatedDraft)
    if (!usedAI) {
      const usageLogEntry = await logAIUsage({
        featureName: "Application content generation",
        model: "local-template",
        approximateCostUsd: 0
      })
      setAIUsageLog((current) => [usageLogEntry, ...current])
    }
    clearSaveAttempt("application-content")
    setContentStatus(
      usedAI
        ? "Editable AI application content generated"
        : aiFallbackMessage || "Editable application content generated"
    )
    setTimeout(() => setContentStatus(""), aiFallbackMessage ? 8000 : 3500)
  }

  const handleInsertApplicationContent = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.id) {
      setContentStatus("Could not access current tab")
      setTimeout(() => setContentStatus(""), 2500)
      return
    }

    try {
      await ensureContentScriptReady(activeTab.id)
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_INSERT_APPLICATION_CONTENT"
      })) as AutofillResponse

      if (response.message) {
        setContentStatus(response.message)
      } else if (response.filledFields.length === 0) {
        setContentStatus("No obvious empty content fields found")
      } else {
        setContentStatus(`Inserted ${response.filledFields.length} fields`)
      }
    } catch {
      setContentStatus("Content insertion is not available on this page")
    }

    setTimeout(() => setContentStatus(""), 2500)
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

    const details = await detectJobPageFromTab(activeTab)

    if (!details) {
      setTrackerStatus("Could not detect job details on this page.")
      return
    }

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
      notes:
        current.notes ||
        [details.jobDescription, formatJobPageNotes(details)]
          .filter(Boolean)
          .join("\n\n")
    }))
    clearSaveAttempt("tracker")
    setTrackerStatus(
      details.roleTitle || details.company
        ? "Current job page imported"
        : "Current tab imported"
    )
    setTimeout(() => setTrackerStatus(""), 3500)
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

  const handleClearAIUsageLog = async () => {
    await clearAIUsageLog()
    setAIUsageLog([])
    setUsageLogStatus("Usage log cleared")
    setTimeout(() => setUsageLogStatus(""), 2500)
  }

  const handleSignOut = async () => {
    await clearAccountSession()
    await logDiagnosticEvent({
      area: "sidepanel",
      event: "account-session-cleared",
      message: "Account session cleared from extension side panel.",
      status: "info"
    })
    await loadDiagnosticLog()
    setAccountSession(null)
    setAccountStatus("Signed out")
    setTimeout(() => setAccountStatus(""), 2500)
  }

  const handleSyncProfileToDashboard = async () => {
    if (!savedProfile) {
      setAccountStatus("Save profile essentials before syncing.")
      setTimeout(() => setAccountStatus(""), 3500)
      return
    }

    try {
      await logDiagnosticEvent({
        area: "sync",
        event: "profile-sync-started",
        message: "Profile sync started from extension side panel.",
        status: "info"
      })
      await syncProfileToDashboard({
        profile: savedProfile,
        session: (await getActiveSession()).session
      })
      await logDiagnosticEvent({
        area: "sync",
        event: "profile-sync-completed",
        message: "Profile synced to dashboard from extension side panel.",
        status: "success"
      })
      setAccountStatus("Profile synced to dashboard")
    } catch (error: unknown) {
      await logDiagnosticEvent({
        area: "sync",
        event: "profile-sync-failed",
        message:
          error instanceof Error ? error.message : "Profile sync failed",
        status: "error"
      })
      setAccountStatus(
        error instanceof Error ? error.message : "Profile sync failed"
      )
    }

    await loadDiagnosticLog()
    setTimeout(() => setAccountStatus(""), 5000)
  }

  const handleExportDiagnosticLog = async () => {
    const entries = await getDiagnosticLog()
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-diagnostic-log.json"
    link.click()
    URL.revokeObjectURL(url)

    setDiagnosticLog(entries)
    setAccountStatus("Diagnostic log exported")
    setTimeout(() => setAccountStatus(""), 2500)
  }

  const handleClearDiagnosticLog = async () => {
    await clearDiagnosticLog()
    setDiagnosticLog([])
    setAccountStatus("Diagnostic log cleared")
    setTimeout(() => setAccountStatus(""), 2500)
  }

  const handleLoadProfileFromDashboard = async () => {
    try {
      const syncedProfile = await loadProfileFromDashboard(
        (await getActiveSession()).session
      )

      if (!syncedProfile) {
        setAccountStatus("No synced dashboard profile found.")
        setTimeout(() => setAccountStatus(""), 3500)
        return
      }

      await saveProfile(syncedProfile)
      setSavedProfile(syncedProfile)
      setProfile(syncedProfile)
      setAccountStatus("Dashboard profile loaded into extension")
    } catch (error: unknown) {
      setAccountStatus(
        error instanceof Error ? error.message : "Could not load profile"
      )
    }

    setTimeout(() => setAccountStatus(""), 5000)
  }

  const handleTrackJob = async () => {
    if (isTrackingJob) {
      return
    }

    setIsTrackingJob(true)

    try {
      await saveCurrentTabAsApplication()
    } finally {
      setIsTrackingJob(false)
    }
  }

  const renderLegacyTools = false
  const isProCustomer = accountSession?.plan === "pro"
  const hasParsedDescription = Boolean(trackedJobDetails?.jobDescription.trim())
  const shouldShowDeepInsightList = hasParsedDescription || isProCustomer
  const pricingUrl = `${appUrl}/pricing`
  const basicInsights = getBasicInsights(trackedJobDetails)
  const deepInsights = getDeepInsights(trackedJobDetails)

  return (
    <main className="side-panel-shell track-only-shell">
      <header className="side-panel-brand">
        <img alt="" aria-hidden="true" src="/icons/128.png" />
        <h1>AutoTime EU Apply</h1>
      </header>

      {accountSession ? (
        <p className="account-identity-badge account-identity-connected">
          <span className="account-identity-dot" aria-hidden="true" />
          Signed in as {accountSession.email} via{" "}
          {formatProviderLabel(accountSession.provider)}
        </p>
      ) : (
        <button
          type="button"
          className="account-identity-badge account-identity-disconnected"
          onClick={openExtensionConnect}
        >
          <span className="account-identity-dot" aria-hidden="true" />
          Not connected — tracked jobs save locally only. Click to connect.
        </button>
      )}

      <section className="track-job-panel" aria-label="Track job">
        <div className="job-insights-panel">
          <div>
            <p className="panel-eyebrow">Job insights</p>
            <h3>Basic insight</h3>
          </div>
          <ul className={hasParsedDescription ? "" : "empty-insight-list"}>
            {basicInsights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>

          <div className="deep-insight-shell">
            <div>
              <p className="panel-eyebrow">Deep insight</p>
              {isProCustomer ? <h3>Pro analysis</h3> : null}
            </div>
            {shouldShowDeepInsightList ? (
              <ul className={isProCustomer ? "" : "blurred-insights"}>
                {deepInsights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            ) : null}
            {!isProCustomer ? (
              <p className="upgrade-note">
                Deep matching, gaps and priority guidance are available after
                upgrading.{" "}
                <a href={pricingUrl} rel="noreferrer" target="_blank">
                  Upgrade to Pro
                </a>
              </p>
            ) : !hasParsedDescription ? (
              <p className="upgrade-note">
                Deep analysis appears after a job description is parsed.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="job-details-panel" aria-labelledby="job-details-title">
          <div>
            <p className="panel-eyebrow">Job details</p>
            <h3 id="job-details-title">Parsed from job board</h3>
          </div>
          <dl className="job-details-list">
            <div>
              <dt>Job title</dt>
              <dd>{trackedJobDetails?.roleTitle || "Not tracked yet"}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{trackedJobDetails?.company || "Not detected"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{trackedJobDetails?.location || "Not detected"}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{trackedJobDetails?.platform || "Waiting"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{trackedJobDetails?.source || "Waiting"}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>
                {trackedJobDetails?.jobDescription
                  ? `${getWordCount(trackedJobDetails.jobDescription)} words parsed`
                  : "Not parsed yet"}
              </dd>
            </div>
          </dl>
        </aside>

        <div className="track-action-bar">
          <button
            className="dashboard-panel-button"
            type="button"
            onClick={openProfileSetup}
          >
            OPEN DASHBOARD
          </button>

          <div className="track-action-copy">
            <button
              className="track-job-button"
              disabled={isTrackingJob}
              type="button"
              onClick={handleTrackJob}
            >
              TRACK JOB
            </button>
          </div>

          {applicationsStatus && (
            <p
              className={getStatusClassName(applicationsStatus)}
              ref={applicationsStatusRef}
              role="status"
              tabIndex={-1}
            >
              {applicationsStatus}
            </p>
          )}
        </div>
      </section>

      <details className="sync-diagnostics-panel">
        <summary>Sync diagnostics</summary>
        <p className="sync-diagnostics-hint">
          Shows what actually happened during the last few Track Job syncs —
          useful if a job says &quot;synced&quot; but isn&apos;t showing up
          in the dashboard.
        </p>
        {diagnosticLog.filter(
          (entry) => entry.area === "sync" || entry.area === "connect"
        ).length === 0 ? (
          <p className="sync-diagnostics-empty">No sync events recorded yet.</p>
        ) : (
          <ul className="sync-diagnostics-list">
            {diagnosticLog
              .filter((entry) => entry.area === "sync" || entry.area === "connect")
              .slice(0, 8)
              .map((entry) => (
                <li key={entry.id} className={`sync-diagnostics-entry status-${entry.status}`}>
                  <span className="sync-diagnostics-event">{entry.event}</span>
                  <span className="sync-diagnostics-time">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                  {entry.message ? (
                    <span className="sync-diagnostics-message">{entry.message}</span>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
        <button
          className="secondary-button"
          disabled={diagnosticLog.length === 0}
          type="button"
          onClick={handleExportDiagnosticLog}
        >
          Export full diagnostic log
        </button>
      </details>

      {renderLegacyTools ? (
        <>
          <Onboarding onNavigate={goToSection} />

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
        </>
      ) : null}

      {renderLegacyTools ? (
        activeSection === "profile" ? (
        <ProfileSection
          issues={profileIssues}
          onAutofillCurrentPage={handleAutofillCurrentPage}
          onFieldChange={updateField}
          onOpenProfileSetup={openProfileSetup}
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
          onImportCurrentJobPage={handleImportCurrentJobPageForAnalysis}
          onSave={handleSaveJobAnalysis}
          saveAttempted={saveAttempts["job-analysis"]}
          savedDraft={savedJobAnalysisDraft}
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
          onGenerate={handleGenerateApplicationContent}
          onInsertCurrentPage={handleInsertApplicationContent}
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
          applicationSyncState={applicationSyncState}
          searchQuery={applicationSearchQuery}
          status={applicationsStatus}
          statusFilter={applicationStatusFilter}
          statusRef={applicationsStatusRef}
          visibleApplications={visibleApplications}
          onDeleteApplication={deleteSavedApplication}
          onExportApplications={exportApplications}
          onExportV2Dashboard={exportV2Dashboard}
          onSaveCurrentTab={saveCurrentTabAsApplication}
          onSearchQueryChange={setApplicationSearchQuery}
          onSyncApplications={retryApplicationSync}
          onStatusFilterChange={setApplicationStatusFilter}
          onUpdateApplication={updateSavedApplication}
        />
      ) : activeSection === "usage-log" ? (
        <UsageLogSection
          entries={aiUsageLog}
          onClear={handleClearAIUsageLog}
          status={usageLogStatus}
          statusRef={usageLogStatusRef}
        />
      ) : activeSection === "validation-metrics" ? (
        <ValidationMetricsSection
          metrics={validationMetrics}
          onExport={exportValidationMetrics}
        />
      ) : activeSection === "account" ? (
        <AccountSection
          canSyncProfile={Boolean(savedProfile)}
          diagnosticLog={diagnosticLog}
          onClearDiagnosticLog={handleClearDiagnosticLog}
          onExportDiagnosticLog={handleExportDiagnosticLog}
          onLoadProfileFromDashboard={handleLoadProfileFromDashboard}
          onSignOut={handleSignOut}
          onSyncProfileToDashboard={handleSyncProfileToDashboard}
          session={accountSession}
          status={accountStatus}
          statusRef={accountStatusRef}
        />
      ) : (
        <section className="panel-section">
          <h2>AutoTime EU Apply</h2>
        </section>
        )
      ) : null}
    </main>
  )
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <SidePanelApp />
)
