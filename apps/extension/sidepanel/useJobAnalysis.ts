import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  inferJobFitAnalysis,
  inferLocationFromJobDescription
} from "../lib/job-analysis"
import {
  formatJobPageNotes,
  inferJobPageDetails,
} from "../lib/job-page"
import {
  generateAIJobAnalysis,
  getOpenAIErrorMessage
} from "../lib/openai"
import {
  logAIUsage,
  saveJobAnalysisDraft,
  type AIUsageLogEntry,
  type CandidateProfile,
  type JobAnalysisDraft
} from "../lib/storage"
import { validateJobAnalysisDraft } from "../lib/validation"
import { emptyJobAnalysisDraft, type Section } from "./constants"
import type { JobPageResponse } from "./types"

type UseJobAnalysisArgs = {
  authToken: string | null
  canUseBackendAI: () => boolean
  clearSaveAttempt: (section: Section) => void
  getBackendAISkipMessage: () => string
  markSaveAttempted: (section: Section) => void
  savedProfile: CandidateProfile | null
  setAIUsageLog: Dispatch<SetStateAction<AIUsageLogEntry[]>>
}

export function useJobAnalysis({
  authToken,
  canUseBackendAI,
  clearSaveAttempt,
  getBackendAISkipMessage,
  markSaveAttempted,
  savedProfile,
  setAIUsageLog
}: UseJobAnalysisArgs) {
  const [jobAnalysisDraft, setJobAnalysisDraft] = useState<JobAnalysisDraft>(
    emptyJobAnalysisDraft
  )
  const [savedJobAnalysisDraft, setSavedJobAnalysisDraft] =
    useState<JobAnalysisDraft | null>(null)
  const [jobStatus, setJobStatus] = useState("")
  const jobStatusRef = useRef<HTMLParagraphElement | null>(null)

  const jobAnalysisIssues = useMemo(
    () => validateJobAnalysisDraft(jobAnalysisDraft),
    [jobAnalysisDraft]
  )

  const updateJobAnalysisField = <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => {
    setJobAnalysisDraft((current) => {
      const updated = { ...current, [key]: value }

      if (
        key === "jobDescription" &&
        typeof value === "string" &&
        !current.location.trim()
      ) {
        const inferredLocation = inferLocationFromJobDescription(value)

        if (inferredLocation) {
          return { ...updated, location: inferredLocation }
        }
      }

      return updated
    })
  }

  const handleSaveJobAnalysis = async () => {
    markSaveAttempted("job-analysis")

    if (jobAnalysisIssues.length > 0) {
      setJobStatus(
        "Complete the highlighted job analysis fields before saving."
      )
      return
    }

    let analysis = inferJobFitAnalysis(jobAnalysisDraft, savedProfile)
    let usedAI = false
    let aiFallbackMessage = getBackendAISkipMessage()

    if (canUseBackendAI()) {
      try {
        const aiAnalysis = await generateAIJobAnalysis({
          authToken,
          draft: jobAnalysisDraft,
          profile: savedProfile
        })
        analysis = aiAnalysis.value
        const usageLogEntry = await logAIUsage({
          featureName: "Job analysis",
          model: "web-backend",
          approximateCostUsd: aiAnalysis.approximateCostUsd
        })
        setAIUsageLog((current) => [usageLogEntry, ...current])
        usedAI = true
        aiFallbackMessage = ""
      } catch (error) {
        analysis = inferJobFitAnalysis(jobAnalysisDraft, savedProfile)
        aiFallbackMessage = `AutoTime AI failed: ${getOpenAIErrorMessage(
          error
        )} Used local fallback.`
      }
    }

    const analysedDraft = { ...jobAnalysisDraft, ...analysis }

    await saveJobAnalysisDraft(analysedDraft)
    setSavedJobAnalysisDraft(analysedDraft)
    setJobAnalysisDraft(emptyJobAnalysisDraft)
    clearSaveAttempt("job-analysis")
    setJobStatus(
      usedAI
        ? "AI job analysis draft saved"
        : aiFallbackMessage || "Job analysis draft saved"
    )
    setTimeout(() => setJobStatus(""), aiFallbackMessage ? 8000 : 3500)
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

  const handleImportCurrentJobPageForAnalysis = async () => {
    setJobStatus("Detecting current job page...")

    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.id) {
      setJobStatus("Could not access current tab.")
      return
    }

    const details = await detectJobPageFromTab(activeTab)

    if (!details) {
      setJobStatus("Could not detect job details on this page.")
      return
    }

    if (details.message && !details.roleTitle && !details.company) {
      setJobStatus(details.message)
      return
    }

    setJobAnalysisDraft((current) => ({
      ...current,
      jobTitle: current.jobTitle || details.roleTitle,
      company: current.company || details.company,
      jobUrl: current.jobUrl || details.url,
      location: current.location || details.location,
      jobDescription: current.jobDescription || details.jobDescription,
      notes: current.notes || formatJobPageNotes(details)
    }))
    clearSaveAttempt("job-analysis")
    setJobStatus(
      details.roleTitle || details.company
        ? "Current job page imported"
        : "Current tab imported"
    )
    setTimeout(() => setJobStatus(""), 3500)
  }

  return {
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
  }
}
