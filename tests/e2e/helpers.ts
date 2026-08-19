import type { Page } from "@playwright/test"
import {
  sampleCandidateProfile,
  sampleReusableAnswers,
  sampleUser
} from "../fixtures/sample-user"

export const dashboardStorageKey = `autotime-v2-companion-dashboard:${sampleUser.id}`
export const onboardingCompleteKey = `autotime-v2-onboarding-complete:${sampleUser.id}`

export async function seedReadyDashboardProfile(page: Page) {
  // HomeExperience re-verifies onboarding completion against the server on
  // every /dashboard load (GET /api/profile/onboarding), regardless of the
  // local onboardingCompleteKey flag set below - that flag alone used to be
  // sufficient but no longer is. Without this mock, the fake e2e test-auth
  // user (which has no real `profiles` row) reads back onboarding_completed_at
  // as falsy and gets redirected straight to /dashboard/onboarding on any
  // bare /dashboard visit.
  await page.route("**/api/profile/onboarding", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    await route.fulfill({
      json: {
        data: {
          alert_frequency: "weekly",
          alert_last_sent_at: null,
          base_cv_text: sampleCandidateProfile.baseCvText,
          country_current: sampleCandidateProfile.currentCountry,
          countries_target: sampleCandidateProfile.targetCountries
            .split(",")
            .map((item) => item.trim()),
          email: sampleCandidateProfile.email,
          full_name: sampleCandidateProfile.fullName,
          github_url: sampleCandidateProfile.githubUrl || null,
          linkedin_url: sampleCandidateProfile.linkedInUrl || null,
          onboarding_completed_at: "2026-01-01T00:00:00.000Z",
          onboarding_ready: true,
          phone: sampleCandidateProfile.phone || null,
          photoUrl: null,
          portfolio_url: sampleCandidateProfile.portfolioUrl || null,
          work_right_details: sampleCandidateProfile.workRightDetails
        },
        error: null
      }
    })
  })
  await page.addInitScript(
    ({ key, onboardingKey, profile, reusableAnswers }) => {
      // Local-only signal, paired with the server-side mock registered
      // above - HomeExperience requires both to skip the onboarding wizard.
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
