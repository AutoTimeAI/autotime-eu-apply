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
