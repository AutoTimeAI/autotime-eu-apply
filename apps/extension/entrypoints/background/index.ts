import { defineBackground } from "wxt/utils/define-background"
import { appUrl } from "../../lib/openai"
import {
  getApplications,
  getReusableAnswers,
  saveAccountSession,
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
  error?: string
  ok: boolean
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
        sendResponse({ error: "Untrusted sender", ok: false })
        return false
      }

      const session = parseAccountSession(message)

      if (!session) {
        sendResponse({ error: "Invalid account session", ok: false })
        return false
      }

      void saveAccountSession(session)
        .then(async () => {
          const applications = await getApplications()

          if (applications.length > 0) {
            try {
              await syncApplicationsToDashboard({
                applications,
                reusableAnswers: await getReusableAnswers(),
                session
              })
            } catch {
              // Keep account connection successful; saved jobs can retry sync later.
            }
          }

          sendResponse({ ok: true })
        })
        .catch(() =>
          sendResponse({ error: "Could not save account session", ok: false })
        )

      return true
    }
  )
})
