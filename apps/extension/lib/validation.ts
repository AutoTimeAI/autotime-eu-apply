// Field-level validation for the side panel's editable drafts (profile, job
// analysis, application content, reusable answers, tracker). Each
// `validateX` function returns a list of `{ field, message }` issues rather
// than throwing, so the UI can highlight individual invalid fields; the
// `getXIssueForField` helpers look one up by field name for rendering next
// to the relevant input. Required-field lists and per-field minimum word
// counts are defined as data at the top of the file so the rules are easy
// to scan and adjust.
import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers,
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

export type ReusableAnswerIssue = {
  field: keyof ReusableAnswers
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
  { field: "targetCountries", label: "Target countries" },
  { field: "targetRoles", label: "Target roles" },
  { field: "workRightDetails", label: "Work authorisation status" },
  { field: "baseCvText", label: "CV text" }
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

const applicationContentWordRules: Array<{
  field: keyof ApplicationContentDraft
  label: string
  minWords: number
}> = [
  { field: "coverLetter", label: "Cover letter", minWords: 80 },
  { field: "profileSummary", label: "Profile summary", minWords: 25 },
  { field: "motivationAnswer", label: "Motivation answer", minWords: 20 },
  { field: "strengthsAnswer", label: "Strengths answer", minWords: 12 },
  { field: "availabilityAnswer", label: "Availability answer", minWords: 5 }
]

const requiredReusableAnswerFields: Array<{
  field: keyof ReusableAnswers
  label: string
}> = []

const reusableAnswerWordRules: Array<{
  field: keyof ReusableAnswers
  label: string
  minWords: number
}> = [
  { field: "sponsorshipAnswer", label: "Sponsorship answer", minWords: 4 },
  { field: "relocationAnswer", label: "Relocation answer", minWords: 4 },
  {
    field: "workAuthorisationAnswer",
    label: "Work authorisation answer",
    minWords: 5
  },
  { field: "noticePeriodAnswer", label: "Notice period answer", minWords: 4 },
  {
    field: "salaryExpectationAnswer",
    label: "Salary expectation answer",
    minWords: 4
  },
  { field: "motivationAnswer", label: "Motivation answer", minWords: 12 },
  { field: "strengthsAnswer", label: "Strengths answer", minWords: 8 },
  { field: "availabilityAnswer", label: "Availability answer", minWords: 5 }
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

export function countWords(value: string) {
  return value.trim().match(/\S+/g)?.length ?? 0
}

function getMinimumWordMessage(label: string, minWords: number) {
  return `${label} must be at least ${minWords} words.`
}

/**
 * Validates the profile essentials draft: required fields present, email
 * format, and phone format (must be `+` followed by 7-15 digits, and must
 * start with the calling code for `currentCountry` if that country is
 * recognized). Returns an empty array when valid.
 */
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

/** Validates the job analysis draft: required fields present, work mode selected (not "unknown"), and job URL is a well-formed http(s) URL if non-empty. */
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
      issues.push({
        field: "jobUrl",
        message: "Job URL format does not match."
      })
    }
  }

  return issues
}

/** Validates application content: cover letter, profile summary, and motivation answer are required; every non-empty field must meet its per-field minimum word count (`applicationContentWordRules`), even fields that aren't required. */
export function validateApplicationContentDraft(
  draft: ApplicationContentDraft
): ApplicationContentIssue[] {
  const issues: ApplicationContentIssue[] = []

  for (const { field, label } of requiredApplicationContentFields) {
    if ((draft[field] ?? "").trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  for (const { field, label, minWords } of applicationContentWordRules) {
    const value = draft[field] ?? ""

    if (value.trim() !== "" && countWords(value) < minWords) {
      issues.push({
        field,
        message: getMinimumWordMessage(label, minWords)
      })
    }
  }

  return issues
}

/** Validates reusable answers: none are strictly required (`requiredReusableAnswerFields` is empty - these are optional shortcuts), but any non-empty answer must meet its minimum word count (`reusableAnswerWordRules`). */
export function validateReusableAnswers(
  answers: ReusableAnswers
): ReusableAnswerIssue[] {
  const issues: ReusableAnswerIssue[] = []

  for (const { field, label } of requiredReusableAnswerFields) {
    if ((answers[field] ?? "").trim() === "") {
      issues.push({ field, message: `${label} is required.` })
    }
  }

  for (const { field, label, minWords } of reusableAnswerWordRules) {
    const value = answers[field] ?? ""

    if (value.trim() !== "" && countWords(value) < minWords) {
      issues.push({
        field,
        message: getMinimumWordMessage(label, minWords)
      })
    }
  }

  return issues
}

/** Validates the tracker draft: required fields present, application URL is a well-formed http(s) URL if non-empty, and next action date (if set) parses as a valid calendar date. */
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

export function getReusableAnswerIssueForField(
  issues: ReusableAnswerIssue[],
  field: keyof ReusableAnswers
) {
  return issues.find((issue) => issue.field === field)?.message
}

export function getTrackerIssueForField(
  issues: TrackerIssue[],
  field: keyof TrackerDraft
) {
  return issues.find((issue) => issue.field === field)?.message
}
