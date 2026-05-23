import type { Page } from "@playwright/test"
import {
  sampleCandidateProfile,
  sampleReusableAnswers,
  sampleUser
} from "../fixtures/sample-user"

export const dashboardStorageKey = `autotime-v2-companion-dashboard:${sampleUser.id}`

export async function seedReadyDashboardProfile(page: Page) {
  await page.addInitScript(
    ({ key, profile, reusableAnswers }) => {
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
      profile: sampleCandidateProfile,
      reusableAnswers: sampleReusableAnswers
    }
  )
}

export async function fillJobImport(
  page: Page,
  job: {
    company: string
    description: string
    title: string
    url: string
  }
) {
  await page.getByLabel("Job title").fill(job.title)
  await page.getByLabel("Company").fill(job.company)
  await page.getByLabel("Job URL").fill(job.url)
  await page.getByLabel("Job description").fill(job.description)
  await page.getByLabel("Job title").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
  await page.getByLabel("Job description").evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
  await page.waitForFunction(
    ({ key, title }) => {
      const stored = window.localStorage.getItem(key)
      if (!stored) {
        return false
      }
      return JSON.parse(stored).jobAnalysis?.jobTitle === title
    },
    { key: dashboardStorageKey, title: job.title }
  )
}

export async function saveFitResultAsTrackedJob(page: Page) {
  await page.getByRole("button", { name: "Save EU fit result" }).click()
  await page.waitForFunction((key) => {
    const stored = window.localStorage.getItem(key)
    if (!stored) {
      return false
    }
    return JSON.parse(stored).applications?.length > 0
  }, dashboardStorageKey)
  await page.waitForURL(/\/dashboard\/applications/)
}
