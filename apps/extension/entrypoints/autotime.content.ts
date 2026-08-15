import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"
import { showEscoMatchOverlay } from "../lib/match-overlay"

export default defineContentScript({
  matches: ["*://*/*"],
  main() {
    // Register page-level message handlers used by the side panel.
    registerAutotimeContentScript()
    window.setTimeout(() => void showEscoMatchOverlay().catch(() => undefined), 1200)
  }
})
