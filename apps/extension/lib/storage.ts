export type CandidateProfile = {
  fullName: string
  email: string
  phone: string
  currentCountry: string
  currentCity: string
  sponsorshipNeeded: boolean
  relocationWillingness: "yes" | "no" | "depends"
  noticePeriod: string
}

export type ReusableAnswers = {
  sponsorshipAnswer: string
  relocationAnswer: string
  workAuthorisationAnswer: string
  noticePeriodAnswer: string
}

export type ApplicationStatus =
  | "draft"
  | "applied"
  | "interview"
  | "rejected"
  | "offer"

export type ApplicationRecord = {
  id: string
  title: string
  url: string
  company?: string
  roleTitle?: string
  source?: string
  createdAt: string
  status: ApplicationStatus
  nextAction?: string
  nextActionDate?: string
  notes?: string
}

export type JobAnalysisDraft = {
  jobTitle: string
  company: string
  jobUrl: string
  location: string
  workMode: "onsite" | "hybrid" | "remote" | "unknown"
  notes: string
}

export type ApplicationContentDraft = {
  coverLetter: string
  profileSummary: string
  motivationAnswer: string
  strengthsAnswer: string
  availabilityAnswer: string
}

export type TrackerDraft = {
  roleTitle: string
  company: string
  applicationUrl: string
  status: ApplicationStatus
  nextAction: string
  nextActionDate: string
  notes: string
}

const PROFILE_KEY = "candidate-profile"
const REUSABLE_ANSWERS_KEY = "reusable-answers"
const APPLICATIONS_KEY = "saved-applications"
const JOB_ANALYSIS_KEY = "job-analysis-draft"
const APPLICATION_CONTENT_KEY = "application-content-draft"
const TRACKER_DRAFT_KEY = "tracker-draft"

export async function saveProfile(profile: CandidateProfile) {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile })
}

export async function getProfile(): Promise<CandidateProfile | null> {
  const result = await chrome.storage.local.get(PROFILE_KEY)
  return (result[PROFILE_KEY] as CandidateProfile) ?? null
}

export async function clearProfile() {
  await chrome.storage.local.remove(PROFILE_KEY)
}

export async function saveReusableAnswers(answers: ReusableAnswers) {
  await chrome.storage.local.set({ [REUSABLE_ANSWERS_KEY]: answers })
}

export async function getReusableAnswers(): Promise<ReusableAnswers | null> {
  const result = await chrome.storage.local.get(REUSABLE_ANSWERS_KEY)
  return (result[REUSABLE_ANSWERS_KEY] as ReusableAnswers) ?? null
}

export async function clearReusableAnswers() {
  await chrome.storage.local.remove(REUSABLE_ANSWERS_KEY)
}

export async function saveJobAnalysisDraft(draft: JobAnalysisDraft) {
  await chrome.storage.local.set({ [JOB_ANALYSIS_KEY]: draft })
}

export async function getJobAnalysisDraft(): Promise<JobAnalysisDraft | null> {
  const result = await chrome.storage.local.get(JOB_ANALYSIS_KEY)
  return (result[JOB_ANALYSIS_KEY] as JobAnalysisDraft) ?? null
}

export async function clearJobAnalysisDraft() {
  await chrome.storage.local.remove(JOB_ANALYSIS_KEY)
}

export async function saveApplicationContentDraft(
  draft: ApplicationContentDraft
) {
  await chrome.storage.local.set({ [APPLICATION_CONTENT_KEY]: draft })
}

export async function getApplicationContentDraft(): Promise<ApplicationContentDraft | null> {
  const result = await chrome.storage.local.get(APPLICATION_CONTENT_KEY)
  return (result[APPLICATION_CONTENT_KEY] as ApplicationContentDraft) ?? null
}

export async function clearApplicationContentDraft() {
  await chrome.storage.local.remove(APPLICATION_CONTENT_KEY)
}

export async function saveTrackerDraft(draft: TrackerDraft) {
  await chrome.storage.local.set({ [TRACKER_DRAFT_KEY]: draft })
}

export async function getTrackerDraft(): Promise<TrackerDraft | null> {
  const result = await chrome.storage.local.get(TRACKER_DRAFT_KEY)
  return (result[TRACKER_DRAFT_KEY] as TrackerDraft) ?? null
}

export async function clearTrackerDraft() {
  await chrome.storage.local.remove(TRACKER_DRAFT_KEY)
}

export async function getApplications(): Promise<ApplicationRecord[]> {
  const result = await chrome.storage.local.get(APPLICATIONS_KEY)
  return (result[APPLICATIONS_KEY] as ApplicationRecord[]) ?? []
}

export async function saveApplication(record: ApplicationRecord) {
  const existing = await getApplications()
  const updated = [record, ...existing]
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: updated })
}

export async function deleteApplication(id: string) {
  const existing = await getApplications()
  const updated = existing.filter((record) => record.id !== id)
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: updated })
}

export async function updateApplication(
  id: string,
  changes: Partial<
    Pick<
      ApplicationRecord,
      | "company"
      | "nextAction"
      | "nextActionDate"
      | "notes"
      | "roleTitle"
      | "source"
      | "status"
    >
  >
) {
  const existing = await getApplications()
  const updated = existing.map((record) =>
    record.id === id ? { ...record, ...changes } : record
  )
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: updated })
}
