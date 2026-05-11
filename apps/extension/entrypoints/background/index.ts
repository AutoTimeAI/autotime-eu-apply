import { defineBackground } from "wxt/utils/define-background"
import { appUrl } from "../../lib/openai"
import {
  getApplications,
  getAccountSession,
  getReusableAnswers,
  logDiagnosticEvent,
  saveAccountSession,
  updateApplicationSyncState,
  type AccountSession
} from "../../lib/storage"
import { syncApplicationsToDashboard } from "../../lib/cloud-sync"

type ExternalMessage = {
  authToken?: unknown
  email?: unknown
  plan?: unknown
  type?: unknown
}

type ExternalResponse = {
  connected?: boolean
  error?: string
  ok: boolean
  syncError?: string
  version?: string
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
    email: message.email,
    plan: message.plan === "pro" ? "pro" : "free"
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Dashboard sync failed"
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
    void showWidgetInTab(tab)
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
            details: { email: session.email, plan: session.plan }
          })

          const applications = await getApplications()
          let syncError: string | undefined

          if (applications.length > 0) {
            const applicationIds = applications.map((application) => application.id)
            try {
              await updateApplicationSyncState(applicationIds, "pending")
              await logDiagnosticEvent({
                area: "sync",
                event: "connect-sync-started",
                message: "Syncing locally saved jobs after account connection.",
                status: "info",
                details: { applicationCount: applications.length }
              })
              await syncApplicationsToDashboard({
                applications,
                reusableAnswers: await getReusableAnswers(),
                session
              })
              await updateApplicationSyncState(applicationIds, "synced")
              await logDiagnosticEvent({
                area: "sync",
                event: "connect-sync-completed",
                message: "Locally saved jobs synced after account connection.",
                status: "success",
                details: { applicationCount: applications.length }
              })
            } catch (error: unknown) {
              syncError = getErrorMessage(error)
              await updateApplicationSyncState(applicationIds, "failed", {
                error: syncError
              })
              await logDiagnosticEvent({
                area: "sync",
                event: "connect-sync-failed",
                message: syncError,
                status: "warning",
                details: { applicationCount: applications.length }
              })
            }
          }

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
