// Small shared types for side panel <-> content-script message responses
// and the per-section "has the user attempted to save" tracking used to
// gate validation-error display until after a first save attempt.
import type { JobPageDetails } from "../lib/job-page"
import type { Section } from "./constants"

export type SaveAttempts = Record<Section, boolean>

export type JobPageResponse = JobPageDetails & {
  message?: string
}

export type AutofillResponse = {
  filledFields: string[]
  message?: string
}
