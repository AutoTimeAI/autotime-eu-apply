import { useCallback, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  formatJobPageNotes,
  getLinkedInManualInputMessage,
  inferJobPageDetails,
  isLinkedInUrl
} from "../lib/job-page"
import { hasApplicationWithUrl } from "../lib/applications"
import {
  clearAccountSession,
  getAccountSession,
  getApplications,
  saveApplication,
  type AccountSession,
  type ApplicationRecord
} from "../lib/storage"
import type { AutofillResponse, JobPageResponse } from "./types"
import { getHostname } from "./utils"
import { AutofillButton } from "./AutofillButton"
import { HeaderMenu } from "./HeaderMenu"
import { JobDetectionChip, type DetectionState } from "./JobDetectionChip"
import { MatchAnalysis } from "./MatchAnalysis"
import { PipelineList } from "./PipelineList"
import type { SaveJobResult } from "./SaveJobButton"
import { SaveJobButton } from "./SaveJobButton"

function hasDetectedJob(details: JobPageResponse | null) {
  return Boolean(
    details?.url &&
      (details.roleTitle || details.company || details.jobDescription)
  )
}

function createApplicationRecord(details: JobPageResponse): ApplicationRecord {
  const title = details.roleTitle || details.pageTitle || details.url

  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: details.roleTitle || title,
    company: details.company || undefined,
    url: details.url,
    source: details.source || getHostname(details.url),
    createdAt: new Date().toISOString(),
    status: "Saved",
    notes: [details.jobDescription, formatJobPageNotes(details)]
      .filter(Boolean)
      .join("\n\n")
  }
}

function SidePanelApp() {
  const [accountSession, setAccountSession] = useState<AccountSession | null>(
    null
  )
  const [detectedJob, setDetectedJob] = useState<JobPageResponse | null>(null)
  const [detectionState, setDetectionState] =
    useState<DetectionState>("detecting")
  const [pipelineRefreshKey, setPipelineRefreshKey] = useState(0)
  const [activeTabUrl, setActiveTabUrl] = useState("")
  const lastDetectionKeyRef = useRef("")

  const loadApplications = useCallback(async () => {
    return getApplications()
  }, [])

  const loadAccountSession = useCallback(async () => {
    const session = await getAccountSession()
    setAccountSession(session)
    return session
  }, [])

  const ensureContentScriptReady = useCallback(async (tabId: number) => {
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
  }, [])

  const detectJobPageFromTab = useCallback(
    async (activeTab: chrome.tabs.Tab): Promise<JobPageResponse | null> => {
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
    },
    [ensureContentScriptReady]
  )

  const detectActiveTab = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const activeTab = tabs[0]
      const detectionKey = `${activeTab?.id ?? "none"}:${activeTab?.url ?? ""}:${activeTab?.title ?? ""}`

      if (!force && detectionKey === lastDetectionKeyRef.current) {
        return
      }

      lastDetectionKeyRef.current = detectionKey
      setDetectionState("detecting")
      setActiveTabUrl(activeTab?.url ?? "")

      if (!activeTab) {
        setDetectedJob(null)
        setDetectionState("none")
        return
      }

      const details = await detectJobPageFromTab(activeTab)
      setDetectedJob(details)

      if (isLinkedInUrl(activeTab.url)) {
        setDetectionState("unsupported")
        return
      }

      setDetectionState(hasDetectedJob(details) ? "detected" : "none")
    },
    [detectJobPageFromTab]
  )

  const saveCurrentTabAsApplication =
    useCallback(async (): Promise<SaveJobResult> => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const activeTab = tabs[0]
      const details = activeTab ? await detectJobPageFromTab(activeTab) : null

      if (!details?.url) {
        return "error"
      }

      const applications = await loadApplications()

      if (hasApplicationWithUrl(applications, details.url)) {
        setDetectedJob(details)
        return "already-saved"
      }

      const record = createApplicationRecord(details)
      await saveApplication(record)
      setDetectedJob(details)
      setPipelineRefreshKey((current) => current + 1)
      return "saved"
    }, [detectJobPageFromTab, loadApplications])

  const handleAutofillCurrentPage = useCallback(async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTab = tabs[0]

    if (!activeTab?.id) {
      return "Could not access current tab"
    }

    if (isLinkedInUrl(activeTab.url)) {
      return getLinkedInManualInputMessage()
    }

    try {
      await ensureContentScriptReady(activeTab.id)
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_AUTOFILL_PROFILE"
      })) as AutofillResponse

      if (response.message) {
        return response.message
      }

      if (response.filledFields.length === 0) {
        return "No obvious empty fields found"
      }

      return `Filled ${response.filledFields.length} fields`
    } catch {
      return "Autofill is not available on this page"
    }
  }, [ensureContentScriptReady])

  const handleSignOut = useCallback(async () => {
    await clearAccountSession()
    setAccountSession(null)
  }, [])

  useEffect(() => {
    void loadAccountSession()
    void detectActiveTab({ force: true })
  }, [detectActiveTab, loadAccountSession])

  useEffect(() => {
    const handleActivated = () => {
      void detectActiveTab({ force: true })
    }

    const handleUpdated = (
      _tabId: number,
      changeInfo: { status?: string }
    ) => {
      if (changeInfo.status === "complete") {
        void detectActiveTab()
      }
    }

    chrome.tabs.onActivated.addListener(handleActivated)
    chrome.tabs.onUpdated.addListener(handleUpdated)

    return () => {
      chrome.tabs.onActivated.removeListener(handleActivated)
      chrome.tabs.onUpdated.removeListener(handleUpdated)
    }
  }, [detectActiveTab])

  const autofillDisabledReason = isLinkedInUrl(activeTabUrl)
    ? getLinkedInManualInputMessage()
    : undefined

  return (
    <main className="grid min-h-screen gap-4 bg-slate-50 p-4 text-slate-900">
      <HeaderMenu onSignOut={handleSignOut} />

      <JobDetectionChip details={detectedJob} state={detectionState} />

      <section className="flex gap-2" aria-label="Job actions">
        <SaveJobButton onSave={saveCurrentTabAsApplication} />
        <AutofillButton
          disabledReason={autofillDisabledReason}
          onAutofill={handleAutofillCurrentPage}
        />
      </section>

      <MatchAnalysis accountSession={accountSession} details={detectedJob} />

      <PipelineList refreshKey={pipelineRefreshKey} />
    </main>
  )
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <SidePanelApp />
)
