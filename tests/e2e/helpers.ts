// Provides shared authentication, fixture seeding, and navigation helpers for E2E tests.
import type { Page } from "@playwright/test"
import {
  sampleCandidateProfile,
  sampleReusableAnswers,
  sampleUser
} from "../fixtures/sample-user"

export const dashboardStorageKey = `autotime-v2-companion-dashboard:${sampleUser.id}`
export const onboardingCompleteKey = `autotime-v2-onboarding-complete:${sampleUser.id}`

export async function seedReadyDashboardProfile(page: Page) {
  await page.addInitScript(
    ({ key, onboardingKey, profile, reusableAnswers }) => {
      // First-time dashboard entry is gated behind a one-time onboarding
      // wizard (see components/OnboardingWizard.tsx) unless this flag is
      // already set, regardless of how complete the seeded profile is.
      window.localStorage.setItem(onboardingKey, "true")

      if (window.localStorage.getItem(key)) {
        return
      }

      window.localStorage.setItem(
        key,
        JSON.stringify({
          applications: [],
          evidenceRecords: [],
          interviewPrepPacks: [],
          jobAnalysis: {
            company: "",
            fitScore: 0,
            gaps: [],
            jobDescription: "",
            jobTitle: "",
            jobUrl: "",
            location: "",
            notes: "",
            positioningAngle: "",
            scoreFactors: [],
            seniority: "",
            skills: [],
            summary: "",
            workMode: "unknown"
          },
          outcomeRecords: [],
          profile,
          reusableAnswers
        })
      )
    },
    {
      key: dashboardStorageKey,
      onboardingKey: onboardingCompleteKey,
      profile: sampleCandidateProfile,
      reusableAnswers: sampleReusableAnswers
    }
  )
}

export const jobWorkflowStorageKey = `autotime-phase-3b-workflow-v1:${sampleUser.id}`

export async function fillJobImport(
  page: Page,
  job: {
    company: string
    description: string
    title: string
    url: string
  }
) {
  await page.getByRole("button", { name: "Add a job" }).click()
  await page.getByLabel("Job title").fill(job.title)
  await page.getByLabel("Employer").fill(job.company)
  await page.getByLabel("Source URL").fill(job.url)
  await page.getByLabel("Job description").fill(job.description)
  await page.getByRole("button", { name: "Save job" }).click()
  await page.waitForFunction(
    ({ key, title }) => {
      const stored = window.localStorage.getItem(key)
      if (!stored) {
        return false
      }
      const jobs = JSON.parse(stored).jobs
      return Array.isArray(jobs) && jobs.some((job: { title?: { value?: string } }) => job.title?.value === title)
    },
    { key: jobWorkflowStorageKey, title: job.title }
  )
}
