import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
  TrackerDraft
} from "./storage"
import { getCountryCallingCode } from "./countries.ts"

export type ProfileIssue = {
  field: keyof CandidateProfile
  message: string
}

export type JobAnalysisIssue = {
  field: keyof JobAnalysisDraft
  message: string
}

export type ApplicationContentIssue = {
  field: keyof ApplicationContentDraft
  message: string
}

export type TrackerIssue = {
  field: keyof TrackerDraft
  message: string
}

const requiredProfileFields: Array<{
  field: keyof CandidateProfile
  label: string
}> = [
  { field: "fullName", label: "Full name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "currentCountry", label: "Current country" },
  { field: "currentCity", label: "Current city" },
  { field: "noticePeriod", label: "Notice period" }
]

const requiredJobAnalysisFields: Array<{
  field: keyof JobAnalysisDraft
  label: string
}> = [
  { field: "jobTitle", label: "Job title" },
  { field: "company", label: "Company" },
  { field: "jobUrl", label: "Job URL" },
  { field: "location", label: "Location/country" }
]

const requiredApplicationContentFields: Array<{
  field: keyof ApplicationContentDraft
  label: string
}> = [
  { field: "coverLetter", label: "Cover letter" },
  { field: "profileSummary", label: "Profile summary" },
  { field: "motivationAnswer", label: "Motivation answer" }
]

const requiredTrackerFields: Array<{
  field: keyof TrackerDraft
  label: string
}> = [
  { field: "roleTitle", label: "Role title" },
  { field: "company", label: "Company" },
  { field: "applicationUrl", label: "Application URL" },
  { field: "nextAction", label: "Next action" },
  { field: "nextActionDate", label: "Next action date" }
]

export function validateProfile(profile: CandidateProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = []

  for (const { field, label } of requiredProfileFields) {
    const value = profile[field]

    if (typeof value === "string" && value.trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (
    profile.email.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
  ) {
    issues.push({ field: "email", message: "Email format does not match." })
  }

  const trimmedPhone = profile.phone.trim()
  const normalizedPhone = trimmedPhone.replace(/[^\d+]/g, "")

  if (trimmedPhone !== "" && !/^\+\d{7,15}$/.test(normalizedPhone)) {
    issues.push({
      field: "phone",
      message: "Phone must use international format, for example +441234567890."
    })
  }

  const callingCode = getCountryCallingCode(profile.currentCountry)

  if (
    trimmedPhone !== "" &&
    callingCode &&
    /^\+\d{7,15}$/.test(normalizedPhone) &&
    !normalizedPhone.startsWith(callingCode)
  ) {
    issues.push({
      field: "phone",
      message: `Phone must start with ${profile.currentCountry}'s calling code (${callingCode}).`
    })
  }

  return issues
}

export function validateJobAnalysisDraft(
  draft: JobAnalysisDraft
): JobAnalysisIssue[] {
  const issues: JobAnalysisIssue[] = []

  for (const { field, label } of requiredJobAnalysisFields) {
    const value = draft[field]

    if (typeof value === "string" && value.trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (draft.workMode === "unknown") {
    issues.push({ field: "workMode", message: "Work mode is required." })
  }

  if (draft.jobUrl.trim() !== "") {
    try {
      const url = new URL(draft.jobUrl)
      if (!["http:", "https:"].includes(url.protocol)) {
        issues.push({
          field: "jobUrl",
          message: "Job URL must start with http or https."
        })
      }
    } catch {
      issues.push({ field: "jobUrl", message: "Job URL format does not match." })
    }
  }

  return issues
}

export function validateApplicationContentDraft(
  draft: ApplicationContentDraft
): ApplicationContentIssue[] {
  const issues: ApplicationContentIssue[] = []

  for (const { field, label } of requiredApplicationContentFields) {
    if (draft[field].trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (draft.coverLetter.trim() !== "" && draft.coverLetter.trim().length < 80) {
    issues.push({
      field: "coverLetter",
      message: "Cover letter looks too short."
    })
  }

  if (
    draft.profileSummary.trim() !== "" &&
    draft.profileSummary.trim().length < 40
  ) {
    issues.push({
      field: "profileSummary",
      message: "Profile summary looks too short."
    })
  }

  return issues
}

export function validateTrackerDraft(draft: TrackerDraft): TrackerIssue[] {
  const issues: TrackerIssue[] = []

  for (const { field, label } of requiredTrackerFields) {
    const value = draft[field]

    if (typeof value === "string" && value.trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  if (draft.applicationUrl.trim() !== "") {
    try {
      const url = new URL(draft.applicationUrl)
      if (!["http:", "https:"].includes(url.protocol)) {
        issues.push({
          field: "applicationUrl",
          message: "Application URL must start with http or https."
        })
      }
    } catch {
      issues.push({
        field: "applicationUrl",
        message: "Application URL format does not match."
      })
    }
  }

  if (
    draft.nextActionDate.trim() !== "" &&
    Number.isNaN(new Date(`${draft.nextActionDate}T00:00:00`).getTime())
  ) {
    issues.push({
      field: "nextActionDate",
      message: "Next action date format does not match."
    })
  }

  return issues
}

export function getIssueForField(
  issues: ProfileIssue[],
  field: keyof CandidateProfile
) {
  return issues.find((issue) => issue.field === field)?.message
}

export function getJobIssueForField(
  issues: JobAnalysisIssue[],
  field: keyof JobAnalysisDraft
) {
  return issues.find((issue) => issue.field === field)?.message
}

export function getApplicationContentIssueForField(
  issues: ApplicationContentIssue[],
  field: keyof ApplicationContentDraft
) {
  return issues.find((issue) => issue.field === field)?.message
}

export function getTrackerIssueForField(
  issues: TrackerIssue[],
  field: keyof TrackerDraft
) {
  return issues.find((issue) => issue.field === field)?.message
}
