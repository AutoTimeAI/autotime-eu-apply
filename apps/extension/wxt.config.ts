import { defineConfig } from "wxt"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AutoTime EU Apply",
    description: "Cross-border job application copilot for Europe",
    permissions: ["activeTab", "scripting", "sidePanel", "storage"],
    host_permissions: ["https://autotime-eu-apply.vercel.app/*"],
    externally_connectable: {
      matches: ["https://autotime-eu-apply.vercel.app/*"]
    },
    action: {
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png",
        "48": "icons/48.png",
        "128": "icons/128.png"
      },
      default_title: "AutoTime EU Apply"
    },
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  }
})
