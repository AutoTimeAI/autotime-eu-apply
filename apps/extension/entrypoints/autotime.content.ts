// WXT content-script entrypoint, injected on demand (see the "Runtime
// registration" comment below) into the page's own DOM context. It wires up
// the floating "Track Job" widget and its message handlers (see
// contents/autofill.ts), schedules the passive ESCO match overlay, and
// listens for an explicit LinkedIn match request from the toolbar icon
// click (background/index.ts).
import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"
import { requestLinkedInEscoMatch, showEscoMatchOverlay } from "../lib/match-overlay"

// Runtime registration (not "manifest"): this script is never auto-injected
// on page load and never appears in the manifest's content_scripts list.
// The background service worker injects it on demand, via
// chrome.scripting.executeScript, only when the user explicitly invokes the
// extension (icon click) or the side panel requests job-page detection for
// the active tab. `matches` here only controls which origins WXT is allowed
// to grant host_permissions for runtime injection -- it mirrors the same
// domains already declared in wxt.config.ts, so this does not request any
// additional site access beyond what's already in the manifest.
export default defineContentScript({
  matches: [
    "https://autotime-eu-apply.vercel.app/*",
    "https://*.stepstone.de/*",
    "https://*.indeed.com/*",
    "https://eures.ec.europa.eu/*",
    "https://*.eurotechjobs.com/*",
    "https://*.xing.com/*",
    "https://*.welcometothejungle.com/*"
  ],
  registration: "runtime",
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
