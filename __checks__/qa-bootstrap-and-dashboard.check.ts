import path from "node:path"
import { BrowserCheck, Frequency } from "checkly/constructs"

new BrowserCheck("qa-bootstrap-and-dashboard", {
  name: "Sign-in/bootstrap and dashboard access",
  frequency: Frequency.EVERY_10M,
  locations: ["eu-west-1"],
  tags: ["production", "auth"],
  code: {
    entrypoint: path.join(__dirname, "qa-bootstrap-and-dashboard.spec.ts")
  }
})
