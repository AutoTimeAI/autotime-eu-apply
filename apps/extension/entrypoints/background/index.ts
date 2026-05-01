import { defineBackground } from "wxt/utils/define-background"

export default defineBackground(() => {
  console.log("AutoTime EU Apply background loaded")

  // Let the extension toolbar button open the side panel directly.
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => {
      console.error("Failed to enable side panel action click", error)
    })
})
