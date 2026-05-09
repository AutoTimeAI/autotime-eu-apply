import { defineContentScript } from "wxt/utils/define-content-script"
import { registerAutotimeContentScript } from "../contents/autofill"

const supportedAtsMatches = [
  "*://*.greenhouse.io/*",
  "*://boards.greenhouse.io/*",
  "*://*.lever.co/*",
  "*://jobs.lever.co/*",
  "*://*.myworkdayjobs.com/*",
  "*://*.ashbyhq.com/*",
  "*://jobs.ashbyhq.com/*",
  "*://*.smartrecruiters.com/*",
  "*://*.icims.com/*",
  "*://*.bamboohr.com/*",
  "*://*.teamtailor.com/*",
  "*://*.recruitee.com/*",
  "*://*.jobvite.com/*",
  "*://*.personio.de/*",
  "*://*.personio.com/*"
]

export default defineContentScript({
  matches: supportedAtsMatches,
  excludeMatches: ["*://*.linkedin.com/*"],
  main() {
    // Register page-level message handlers used by the side panel.
    registerAutotimeContentScript()
  }
})
