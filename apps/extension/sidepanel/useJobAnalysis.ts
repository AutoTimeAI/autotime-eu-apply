import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  inferJobFitAnalysis,
  inferLocationFromJobDescription
} from "../lib/job-analysis"
import {
  formatJobPageNotes,
  getLinkedInManualInputMessage,
  inferJobPageDetails,
  isLinkedInUrl
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
  type JobAnalysisDraft,
  type OpenAISettings
} from "../lib/storage"
import { validateJobAnalysisDraft } from "../lib/validation"
import { emptyJobAnalysisDraft, type Section } from "./constants"
import type { JobPageResponse } from "./types"

type UseJobAnalysisArgs = {
  canUseOpenAI: () => boolean
  clearSaveAttempt: (section: Section) => void
  getOpenAISkipMessage: () => string
  markSaveAttempted: (section: Section) => void
  openAISettings: OpenAISettings
  savedProfile: CandidateProfile | null
  setAIUsageLog: Dispatch<SetStateAction<AIUsageLogEntry[]>>
}

export function useJobAnalysis({
  canUseOpenAI,
  clearSaveAttempt,
  getOpenAISkipMessage,
  markSaveAttempted,
  openAISettings,
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
    let aiFallbackMessage = getOpenAISkipMessage()

    if (canUseOpenAI()) {
      try {
        const aiAnalysis = await generateAIJobAnalysis({
          settings: openAISettings,
          draft: jobAnalysisDraft,
          profile: savedProfile
        })
        analysis = aiAnalysis.value
        const usageLogEntry = await logAIUsage({
          featureName: "Job analysis",
          model: openAISettings.model,
          approximateCostUsd: aiAnalysis.approximateCostUsd
        })
        setAIUsageLog((current) => [usageLogEntry, ...current])
        usedAI = true
        aiFallbackMessage = ""
      } catch (error) {
        analysis = inferJobFitAnalysis(jobAnalysisDraft, savedProfile)
        aiFallbackMessage = `OpenAI failed: ${getOpenAIErrorMessage(
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

    if (isLinkedInUrl(activeTab.url)) {
      setJobStatus(getLinkedInManualInputMessage())
      return
    }

    try {
      const details = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_DETECT_JOB_PAGE"
      })) as JobPageResponse

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
        notes: current.notes || formatJobPageNotes(details)
      }))
      clearSaveAttempt("job-analysis")
      setJobStatus("Current job page imported")
      setTimeout(() => setJobStatus(""), 3500)
    } catch {
      const details = inferJobPageDetails({
        title: activeTab.title,
        url: activeTab.url
      })

      if (!details.roleTitle && !details.url) {
        setJobStatus("Could not detect job details on this page.")
        return
      }

      setJobAnalysisDraft((current) => ({
        ...current,
        jobTitle: current.jobTitle || details.roleTitle,
        jobUrl: current.jobUrl || details.url,
        notes: current.notes || formatJobPageNotes(details)
      }))
      clearSaveAttempt("job-analysis")
      setJobStatus("Current tab imported")
      setTimeout(() => setJobStatus(""), 3500)
    }
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
