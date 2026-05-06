import { defineConfig } from "wxt"

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AutoTime EU Apply",
    description: "Cross-border job application copilot for Europe",
    permissions: ["activeTab", "sidePanel", "storage"],
    host_permissions: ["https://autotime-eu-apply.vercel.app/*"],
    action: {
      default_title: "AutoTime EU Apply"
    }
  }
})
