import type { JobPageDetails } from "../lib/job-page"

export type JobPageResponse = JobPageDetails & {
  message?: string
}

export type AutofillResponse = {
  filledFields: string[]
  message?: string
}
