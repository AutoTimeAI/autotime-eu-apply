import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  formatJobPageNotes,
  getLinkedInManualInputMessage,
  inferJobPageDetails,
  isLinkedInUrl
} from "../lib/job-page"
import { generateApplicationContentDraft } from "../lib/content-generation"
import {
  applicationsToCsv,
  filterApplications,
  getApplicationValidationMetrics,
  hasApplicationWithUrl,
  validationMetricsToCsv,
  type ApplicationStatusFilter
} from "../lib/applications"
import {
  clearAIUsageLog,
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearOpenAISettings,
  clearProfile,
  clearReusableAnswers,
  clearTrackerDraft,
  deleteApplication,
  getAIUsageLog,
  getApplications,
  getApplicationContentDraft,
  getJobAnalysisDraft,
  getOpenAISettings,
  getProfile,
  getReusableAnswers,
  getTrackerDraft,
  saveApplication,
  saveApplicationContentDraft,
  saveOpenAISettings,
  saveProfile,
  saveReusableAnswers,
  saveTrackerDraft,
  logAIUsage,
  type AIUsageLogEntry,
  type OpenAISettings,
  updateApplication,
  type ApplicationRecord,
  type ApplicationContentSnapshot,
  type ApplicationContentDraft,
  type CandidateProfile,
  type ReusableAnswers,
  type TrackerDraft
} from "../lib/storage"
import {
  fallbackOpenAICallBudgetUsd,
  generateAIApplicationContentDraft,
  getOpenAIErrorMessage
} from "../lib/openai"
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
import { AISettingsSection } from "./AISettingsSection"
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
import { UsageLogSection } from "./UsageLogSection"
import { ValidationMetricsSection } from "./ValidationMetricsSection"
import type { AutofillResponse, JobPageResponse, SaveAttempts } from "./types"
import { useJobAnalysis } from "./useJobAnalysis"
import { getHostname, normalizeApplicationUrl } from "./utils"
import {
  validateApplicationContentDraft,
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
    applications: false,
    "usage-log": false,
    "validation-metrics": false,
    "ai-settings": false
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
  const [aiUsageLog, setAIUsageLog] = useState<AIUsageLogEntry[]>([])
  const [openAISettings, setOpenAISettings] = useState<OpenAISettings>({
    apiKey: "",
    model: "gpt-4.1-mini",
    monthlyBudgetUsd: 2
  })
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("")
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useState<ApplicationStatusFilter>("all")
  const [status, setStatus] = useState("")
  const [reusableStatus, setReusableStatus] = useState("")
  const [contentStatus, setContentStatus] = useState("")
  const [trackerStatus, setTrackerStatus] = useState("")
  const [applicationsStatus, setApplicationsStatus] = useState("")
  const [usageLogStatus, setUsageLogStatus] = useState("")
  const [aiSettingsStatus, setAISettingsStatus] = useState("")
  const profileStatusRef = useRef<HTMLParagraphElement | null>(null)
  const reusableStatusRef = useRef<HTMLParagraphElement | null>(null)
  const contentStatusRef = useRef<HTMLParagraphElement | null>(null)
  const trackerStatusRef = useRef<HTMLParagraphElement | null>(null)
  const applicationsStatusRef = useRef<HTMLParagraphElement | null>(null)
  const usageLogStatusRef = useRef<HTMLParagraphElement | null>(null)
  const aiSettingsStatusRef = useRef<HTMLParagraphElement | null>(null)

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
      "ai-settings": false
    })
    setStatus("")
    setReusableStatus("")
    setJobStatus("")
    setContentStatus("")
    setTrackerStatus("")
    setApplicationsStatus("")
    setUsageLogStatus("")
    setAISettingsStatus("")
  }

  const loadApplications = async () => {
    const savedApplications = await getApplications()
    setApplications(savedApplications)
  }

  const loadAIUsageLog = async () => {
    const savedUsageLog = await getAIUsageLog()
    setAIUsageLog(savedUsageLog)
  }

  const loadOpenAISettings = async () => {
    const savedOpenAISettings = await getOpenAISettings()
    setOpenAISettings(savedOpenAISettings)
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
      await loadOpenAISettings()
    }

    loadProfile()
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

  const updateOpenAISetting = <K extends keyof OpenAISettings>(
    key: K,
    value: OpenAISettings[K]
  ) => {
    setOpenAISettings((current) => ({ ...current, [key]: value }))
  }

  const getCurrentMonthAIUsageCost = () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return aiUsageLog
      .filter((entry) => entry.createdAt.slice(0, 7) === currentMonth)
      .reduce((sum, entry) => sum + entry.approximateCostUsd, 0)
  }

  const canUseOpenAI = () =>
    openAISettings.apiKey.trim() !== "" &&
    getCurrentMonthAIUsageCost() + fallbackOpenAICallBudgetUsd <=
      openAISettings.monthlyBudgetUsd

  const getOpenAISkipMessage = () => {
    if (!openAISettings.apiKey.trim()) {
      return ""
    }

    if (
      getCurrentMonthAIUsageCost() + fallbackOpenAICallBudgetUsd >
      openAISettings.monthlyBudgetUsd
    ) {
      return "OpenAI skipped: monthly budget cap reached. Used local fallback."
    }

    return ""
  }

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
    canUseOpenAI,
    clearSaveAttempt,
    getOpenAISkipMessage,
    markSaveAttempted,
    openAISettings,
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
      "ai-settings": aiSettingsStatusRef.current
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
      "ai-settings": aiSettingsStatus
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
    aiSettingsStatus,
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

  const getCurrentTabApplicationDetails = async (
    activeTab: chrome.tabs.Tab
  ) => {
    if (activeTab.url && activeTab.title) {
      return inferJobPageDetails({
        title: activeTab.title,
        url: activeTab.url
      })
    }

    if (!activeTab.id) {
      return null
    }

    try {
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
      setApplicationsStatus(
        "Could not read current tab. Open a normal non-LinkedIn job page, then try again."
      )
      setTimeout(() => setApplicationsStatus(""), 4500)
      return
    }

    if (isLinkedInUrl(details.url)) {
      setApplicationsStatus(getLinkedInManualInputMessage())
      setTimeout(() => setApplicationsStatus(""), 3500)
      return
    }

    if (hasApplicationWithUrl(applications, details.url)) {
      setApplicationsStatus("This application is already saved")
      setTimeout(() => setApplicationsStatus(""), 2500)
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

    if (isLinkedInUrl(activeTab.url)) {
      setStatus(getLinkedInManualInputMessage())
      setTimeout(() => setStatus(""), 3500)
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
    let aiFallbackMessage = getOpenAISkipMessage()

    if (canUseOpenAI()) {
      try {
        const aiContent = await generateAIApplicationContentDraft({
          settings: openAISettings,
          profile: savedProfile,
          job: savedJobAnalysisDraft,
          reusableAnswers: savedReusableAnswers
        })
        generatedDraft = aiContent.value
        const usageLogEntry = await logAIUsage({
          featureName: "Application content generation",
          model: openAISettings.model,
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
        aiFallbackMessage = `OpenAI failed: ${getOpenAIErrorMessage(
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

    if (isLinkedInUrl(activeTab.url)) {
      setContentStatus(getLinkedInManualInputMessage())
      setTimeout(() => setContentStatus(""), 3500)
      return
    }

    try {
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

    if (isLinkedInUrl(activeTab.url)) {
      setTrackerStatus(getLinkedInManualInputMessage())
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

  const handleClearAIUsageLog = async () => {
    await clearAIUsageLog()
    setAIUsageLog([])
    setUsageLogStatus("Usage log cleared")
    setTimeout(() => setUsageLogStatus(""), 2500)
  }

  const handleSaveOpenAISettings = async () => {
    await saveOpenAISettings(openAISettings)
    setAISettingsStatus("AI settings saved")
    setTimeout(() => setAISettingsStatus(""), 2500)
  }

  const handleClearOpenAISettings = async () => {
    await clearOpenAISettings()
    const clearedSettings = await getOpenAISettings()
    setOpenAISettings(clearedSettings)
    setAISettingsStatus("AI settings cleared")
    setTimeout(() => setAISettingsStatus(""), 2500)
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
          onImportCurrentJobPage={handleImportCurrentJobPageForAnalysis}
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
      ) : activeSection === "ai-settings" ? (
        <AISettingsSection
          settings={openAISettings}
          status={aiSettingsStatus}
          statusRef={aiSettingsStatusRef}
          onClear={handleClearOpenAISettings}
          onFieldChange={updateOpenAISetting}
          onSave={handleSaveOpenAISettings}
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
