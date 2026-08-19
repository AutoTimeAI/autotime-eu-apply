import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"
import { requestLinkedInEscoMatch, showEscoMatchOverlay } from "../lib/match-overlay"

export default defineContentScript({
  matches: ["*://*/*"],
  main() {
    // Register page-level message handlers used by the side panel.
    registerAutotimeContentScript()
    window.setTimeout(() => void showEscoMatchOverlay().catch(() => undefined), 1200)
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== "AUTOTIME_LINKEDIN_MATCH_REQUEST") return false
      void requestLinkedInEscoMatch().catch(() => undefined)
      return false
    })
  }
})
