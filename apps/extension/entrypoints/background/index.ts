// MV3 background service worker. Raw account tokens live in
// chrome.storage.session and are used only by trusted extension contexts;
// content scripts receive non-secret connection state and proxy authenticated
// scoring/sync operations through this worker.
// Responsibilities:
//   - toolbar icon click: sends AUTOTIME_SHOW_WIDGET to the active tab (via
//     chrome.tabs.sendMessage, falling back to chrome.scripting.executeScript
//     if no listener responds), and AUTOTIME_LINKEDIN_MATCH_REQUEST on
//     LinkedIn job pages
//   - AUTOTIME_SYNC_APPLICATIONS: internal message from the side panel or a
//     content script to push local applications to the dashboard
//   - onMessageExternal: the AUTOTIME_CONNECT_ACCOUNT / AUTOTIME_PING
//     handshake the AutoTime web dashboard uses (via externally_connectable
//     in wxt.config.ts) to hand the extension a signed-in session, answered
//     with AUTOTIME_ACCOUNT_CONNECTED
//   - onInstalled / onStartup / storage.onChanged: retries any
//     applications that failed to sync to the dashboard earlier
import { defineBackground } from "wxt/utils/define-background"
import { appUrl } from "../../lib/openai"
import {
  deleteApplication,
  getApplications,
  getAccountSession,
  getApplicationSyncState,
  logDiagnosticEvent,
  saveAccountSession,
  updateApplicationSyncState,
  type AccountSession,
  type ApplicationRecord
} from "../../lib/storage"
import { getActiveSession, withFreshSession } from "../../lib/session"
import { syncApplicationsToDashboard } from "../../lib/cloud-sync"

type ExternalMessage = {
  authToken?: unknown
  refreshToken?: unknown
  expiresAt?: unknown
  email?: unknown
  plan?: unknown
  provider?: unknown
  type?: unknown
}

type ExternalResponse = {
  connected?: boolean
  error?: string
  ok: boolean
  syncError?: string
  version?: string
}

type InternalMessage = {
  applications?: unknown
  payload?: unknown
  resurrectUrlKeys?: unknown
  type?: unknown
}

type InternalResponse = {
  connected?: boolean
  data?: unknown
  email?: string
  error?: string
  ok: boolean
  plan?: "free" | "pro"
  provider?: AccountSession["provider"]
  reason?: string
  synced?: boolean
}

function isTrustedSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender.url) {
    return false
  }

  try {
    return new URL(sender.url).origin === appUrl
  } catch {
    return false
  }
}

function parseAccountSession(message: ExternalMessage): AccountSession | null {
  if (
    message.type !== "AUTOTIME_CONNECT_ACCOUNT" ||
    typeof message.authToken !== "string" ||
    typeof message.email !== "string"
  ) {
    return null
  }

  return {
    authToken: message.authToken,
    refreshToken: typeof message.refreshToken === "string" ? message.refreshToken : "",
    expiresAt: typeof message.expiresAt === "number" ? message.expiresAt : 0,
    email: message.email,
    plan: message.plan === "pro" ? "pro" : "free",
    provider: typeof message.provider === "string" && message.provider.trim()
      ? message.provider
      : "email"
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Dashboard sync failed"
}

async function syncApplicationsWithState({
  applications,
  completedEvent,
  failedEvent,
  resurrectUrlKeys,
  startedEvent
}: {
  applications: ApplicationRecord[]
  completedEvent: string
  failedEvent: string
  resurrectUrlKeys?: string[]
  startedEvent: string
}) {
  if (applications.length === 0) {
    return undefined
  }

  const applicationIds = applications.map((application) => application.id)

  try {
    await updateApplicationSyncState(applicationIds, "pending")
    await logDiagnosticEvent({
      area: "sync",
      event: startedEvent,
      message: "Syncing locally saved jobs to dashboard.",
      status: "info",
      details: { applicationCount: applications.length }
    })

    const { result: syncResult, error: sessionError } = await withFreshSession(
      (activeSession) =>
        syncApplicationsToDashboard({
          applications,
          resurrectUrlKeys,
          session: activeSession
        })
    )

    if (!syncResult) {
      throw new Error(
        sessionError ?? "Dashboard sync failed because the session could not be refreshed."
      )
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
    await logDiagnosticEvent({
      area: "sync",
      event: completedEvent,
      message: "Locally saved jobs synced to dashboard.",
      status: "success",
      details: {
        applicationCount: syncedApplicationIds.length,
        deletedApplicationCount: deletedApplicationIds.length
      }
    })
    return undefined
  } catch (error: unknown) {
    const syncError = getErrorMessage(error)
    await updateApplicationSyncState(applicationIds, "failed", {
      error: syncError
    })
    await logDiagnosticEvent({
      area: "sync",
      event: failedEvent,
      message: syncError,
      status: "warning",
      details: { applicationCount: applications.length }
    })
    return syncError
  }
}

let retrySyncInFlight = false

async function retryPendingApplicationSync(reason: "installed" | "startup") {
  if (retrySyncInFlight) {
    return
  }

  retrySyncInFlight = true

  try {
    const { session } = await getActiveSession()

    if (!session?.authToken.trim()) {
      await logDiagnosticEvent({
        area: "sync",
        event: `retry-sync-skipped-${reason}`,
        message: "Saved job sync retry skipped because no dashboard session exists.",
        status: "info"
      })
      return
    }

    const [applications, syncState] = await Promise.all([
      getApplications(),
      getApplicationSyncState()
    ])
    const retryableApplications = applications.filter((application) => {
      const status = syncState[application.id]?.status
      return status === "pending" || status === "failed"
    })

    if (retryableApplications.length === 0) {
      await logDiagnosticEvent({
        area: "sync",
        event: `retry-sync-empty-${reason}`,
        message: "No saved jobs need dashboard sync retry.",
        status: "info"
      })
      return
    }

    await syncApplicationsWithState({
      applications: retryableApplications,
      completedEvent: `retry-sync-completed-${reason}`,
      failedEvent: `retry-sync-failed-${reason}`,
      startedEvent: `retry-sync-started-${reason}`
    })
  } finally {
    retrySyncInFlight = false
  }
}

async function broadcastAccountConnected() {
  try {
    const tabs = await chrome.tabs.query({})

    await Promise.allSettled(
      tabs
        .filter((tab) => tab.id)
        .map((tab) =>
          chrome.tabs.sendMessage(tab.id as number, {
            type: "AUTOTIME_ACCOUNT_CONNECTED"
          })
        )
    )
  } catch (error: unknown) {
    await logDiagnosticEvent({
      area: "connect",
      event: "account-connected-broadcast-failed",
      message: getErrorMessage(error),
      status: "warning"
    })
  }
}

async function showWidgetInTab(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOTIME_SHOW_WIDGET"
    })
    return
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-scripts/autotime.js"]
    })
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "AUTOTIME_SHOW_WIDGET"
  })
}

export default defineBackground(() => {
  chrome.action.onClicked.addListener((tab) => {
    void showWidgetInTab(tab).then(() => {
      if (tab.id && tab.url && /^https:\/\/(?:[a-z]+\.)?linkedin\.com\/jobs\//i.test(tab.url)) {
        return chrome.tabs.sendMessage(tab.id, { type: "AUTOTIME_LINKEDIN_MATCH_REQUEST" })
      }
    }).catch(() => undefined)
  })

  chrome.runtime.onMessage.addListener(
    (
      message: InternalMessage,
      _sender,
      sendResponse: (response: InternalResponse) => void
    ) => {
      if (message?.type === "AUTOTIME_GET_ACCOUNT_STATE") {
        void getActiveSession()
          .then(({ session }) => sendResponse({
            connected: Boolean(session?.authToken.trim()),
            email: session?.email,
            ok: true,
            plan: session?.plan,
            provider: session?.provider
          }))
          .catch(() => sendResponse({ connected: false, ok: true }))
        return true
      }

      if (message?.type === "AUTOTIME_SCORE_JOB") {
        void (async () => {
          const { session } = await getActiveSession()
          if (!session?.authToken.trim()) {
            sendResponse({ connected: false, ok: false })
            return
          }
          const response = await fetch(`${appUrl}/api/esco/score-job`, {
            body: JSON.stringify(message.payload),
            headers: {
              Authorization: `Bearer ${session.authToken}`,
              "Content-Type": "application/json",
              "x-autotime-source": "extension"
            },
            method: "POST",
            signal: AbortSignal.timeout(12_000)
          })
          const body = await response.json() as { data?: unknown }
          sendResponse({ data: body.data, ok: response.ok })
        })().catch(() => sendResponse({ ok: false }))
        return true
      }

      if (message?.type !== "AUTOTIME_SYNC_APPLICATIONS") {
        return false
      }

      void (async () => {
        const applications = Array.isArray(message.applications)
          ? (message.applications as ApplicationRecord[])
          : await getApplications()
        const resurrectUrlKeys = Array.isArray(message.resurrectUrlKeys)
          ? message.resurrectUrlKeys.filter(
              (value): value is string => typeof value === "string"
            )
          : undefined
        const applicationIds = applications.map((application) => application.id)
        const { session } = await getActiveSession()

        if (!session?.authToken.trim()) {
          await updateApplicationSyncState(applicationIds, "pending")
          await logDiagnosticEvent({
            area: "sync",
            event: "widget-sync-skipped-unconnected",
            message: "Widget sync skipped because no dashboard session exists.",
            status: "info",
            details: { applicationCount: applications.length }
          })
          sendResponse({
            connected: false,
            ok: true,
            reason: "Click Connect to sync to dashboard",
            synced: false
          })
          return
        }

        const syncError = await syncApplicationsWithState({
          applications,
          completedEvent: "widget-sync-completed",
          failedEvent: "widget-sync-failed",
          resurrectUrlKeys,
          startedEvent: "widget-sync-started"
        })

        sendResponse({
          connected: true,
          ok: true,
          reason: syncError ? `Dashboard sync failed: ${syncError}` : undefined,
          synced: !syncError
        })
      })().catch((error: unknown) => {
        void logDiagnosticEvent({
          area: "sync",
          event: "widget-sync-unexpected-failed",
          message: getErrorMessage(error),
          status: "error"
        })
        sendResponse({
          error: getErrorMessage(error),
          ok: false,
          reason: `Dashboard sync failed: ${getErrorMessage(error)}`,
          synced: false
        })
      })

      return true
    }
  )

  chrome.runtime.onInstalled.addListener(() => {
    void retryPendingApplicationSync("installed")
  })

  chrome.runtime.onStartup.addListener(() => {
    void retryPendingApplicationSync("startup")
  })

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "session" && changes["account-session"]) {
      void retryPendingApplicationSync("startup")
    }
  })

  chrome.runtime.onMessageExternal.addListener(
    (
      message: ExternalMessage,
      sender,
      sendResponse: (response: ExternalResponse) => void
    ) => {
      if (!isTrustedSender(sender)) {
        void logDiagnosticEvent({
          area: "connect",
          event: "external-message-untrusted",
          message: "Dashboard-to-extension message rejected because sender is not trusted.",
          status: "error",
          details: { senderUrl: sender.url ?? "missing" }
        })
        sendResponse({ error: "Untrusted sender", ok: false })
        return false
      }

      if (message.type === "AUTOTIME_PING") {
        void logDiagnosticEvent({
          area: "connect",
          event: "ping-received",
          message: "Dashboard preflight ping reached the extension.",
          status: "info"
        })
        void getAccountSession()
          .then((session) =>
            sendResponse({
              connected: Boolean(session?.authToken.trim()),
              ok: true,
              version: chrome.runtime.getManifest().version
            })
          )
          .catch(() =>
            sendResponse({
              connected: false,
              ok: true,
              version: chrome.runtime.getManifest().version
            })
          )

        return true
      }

      const session = parseAccountSession(message)

      if (!session) {
        void logDiagnosticEvent({
          area: "connect",
          event: "connect-invalid-message",
          message: "Connection message did not include a valid account session.",
          status: "error"
        })
        sendResponse({ error: "Invalid account session", ok: false })
        return false
      }

      void saveAccountSession(session)
        .then(async () => {
          await logDiagnosticEvent({
            area: "connect",
            event: "account-session-saved",
            message: "Account session saved in extension storage.",
            status: "success",
            details: { email: session.email, plan: session.plan, provider: session.provider }
          })

          const applications = await getApplications()
          const syncError = await syncApplicationsWithState({
            applications,
            completedEvent: "connect-sync-completed",
            failedEvent: "connect-sync-failed",
            startedEvent: "connect-sync-started"
          })

          await broadcastAccountConnected()
          await logDiagnosticEvent({
            area: "connect",
            event: "account-connected-broadcast",
            message: "Connection update broadcast to open extension tabs.",
            status: "success"
          })

          sendResponse({ ok: true, syncError })
        })
        .catch((error: unknown) => {
          void logDiagnosticEvent({
            area: "connect",
            event: "account-session-save-failed",
            message: getErrorMessage(error),
            status: "error"
          })
          sendResponse({ error: "Could not save account session", ok: false })
        })

      return true
    }
  )
})
