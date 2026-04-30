import { defineBackground } from "wxt/utils/define-background"

export default defineBackground(() => {
  console.log("AutoTime EU Apply background loaded")

  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.error("Failed to enable side panel action click", error)
    })
})
