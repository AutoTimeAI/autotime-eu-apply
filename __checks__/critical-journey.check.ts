import path from "node:path"
import { BrowserCheck, Frequency } from "checkly/constructs"

new BrowserCheck("critical-journey-applications", {
  name: "Critical journey - applications pipeline reachable",
  frequency: Frequency.EVERY_10M,
  locations: ["eu-west-1"],
  tags: ["production", "critical-journey"],
  code: {
    entrypoint: path.join(__dirname, "critical-journey.spec.ts")
  }
})
