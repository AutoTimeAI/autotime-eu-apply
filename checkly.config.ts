import { defineConfig } from "checkly"
import { Frequency } from "checkly/constructs"

// Config + the three checks in __checks__/ - never deployed by this
// session (no CHECKLY_API_KEY / CHECKLY_ACCOUNT_ID available). See
// docs/quality-assurance.md for what's required to actually deploy these.
export default defineConfig({
  projectName: "AutoTime EU Apply",
  logicalId: "autotime-eu-apply",
  checks: {
    frequency: Frequency.EVERY_10M,
    locations: ["eu-west-1", "us-east-1"],
    tags: ["production", "autotime-eu-apply"],
    runtimeId: "2024.02",
    checkMatch: "__checks__/**/*.check.ts"
  },
  cli: {
    runLocation: "eu-west-1"
  }
})
