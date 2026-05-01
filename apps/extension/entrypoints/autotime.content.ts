import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // Register page-level message handlers used by the side panel.
    registerAutotimeContentScript()
  }
})
