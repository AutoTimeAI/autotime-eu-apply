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
import {
  scoreJobFromDashboard,
  syncApplicationsToDashboard,
  type JobMatchPayload,
  type JobMatchScore
} from "../../lib/cloud-sync"
import { toConnectionState, type ConnectionState } from "../../lib/connection-state"

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
  data?: JobMatchScore
  error?: string
  ok: boolean
  reason?: string
  state?: ConnectionState
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

// Three separate entry points (widget-triggered sync, the connect-account
// flow, and the periodic retry) can each call this - a bare in-flight flag
// on only one of them isn't enough. Queuing every call onto a single chain
// means concurrent calls run one at a time, each with its own arguments
// and its own result, instead of racing their GET-dashboard -> merge ->
// POST cycles (and the local sync-state writes inside them) against each
// other.
let applicationSyncQueue: Promise<unknown> = Promise.resolve()

function syncApplicationsWithState(
  params: Parameters<typeof performApplicationSync>[0]
) {
  const run = applicationSyncQueue.then(() => performApplicationSync(params))
  applicationSyncQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function performApplicationSync({
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

async function broadcastConnectionState(state: ConnectionState) {
  try {
    const tabs = await chrome.tabs.query({})

    await Promise.allSettled(
      tabs
        .filter((tab) => tab.id)
        .map((tab) =>
          chrome.tabs.sendMessage(tab.id as number, {
            type: "AUTOTIME_ACCOUNT_CONNECTED",
            state
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
      if (message?.type === "AUTOTIME_GET_CONNECTION_STATE") {
        void getAccountSession().then((session) => {
          sendResponse({ ok: true, state: toConnectionState(session) })
        })
        return true
      }

      if (message?.type === "AUTOTIME_SCORE_JOB") {
        void (async () => {
          const { result, error } = await withFreshSession((session) =>
            scoreJobFromDashboard(session, (message.payload ?? {}) as JobMatchPayload)
          )

          if (!result) {
            sendResponse({ error, ok: false })
            return
          }

          sendResponse({ data: result, ok: true })
        })().catch((error: unknown) => {
          sendResponse({ error: getErrorMessage(error), ok: false })
        })
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
    if (areaName !== "session" || !changes["account-session"]) {
      return
    }

    void retryPendingApplicationSync("startup")
    void getAccountSession().then((session) => {
      void broadcastConnectionState(toConnectionState(session))
    })
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

          await broadcastConnectionState(toConnectionState(session))
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
