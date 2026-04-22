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

export type ApplicationRecord = {
  id: string
  title: string
  url: string
  company?: string
  createdAt: string
  status: "draft" | "saved" | "applied"
}

const PROFILE_KEY = "candidate-profile"
const REUSABLE_ANSWERS_KEY = "reusable-answers"
const APPLICATIONS_KEY = "saved-applications"

export async function saveProfile(profile: CandidateProfile) {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile })
}

export async function getProfile(): Promise<CandidateProfile | null> {
  const result = await chrome.storage.local.get(PROFILE_KEY)
  return (result[PROFILE_KEY] as CandidateProfile) ?? null
}

export async function saveReusableAnswers(answers: ReusableAnswers) {
  await chrome.storage.local.set({ [REUSABLE_ANSWERS_KEY]: answers })
}

export async function getReusableAnswers(): Promise<ReusableAnswers | null> {
  const result = await chrome.storage.local.get(REUSABLE_ANSWERS_KEY)
  return (result[REUSABLE_ANSWERS_KEY] as ReusableAnswers) ?? null
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
