export type CandidateProfile = {
  fullName: string
  email: string
  phone: string
  linkedInUrl: string
  githubUrl: string
  portfolioUrl: string
  currentCountry: string
  currentCity: string
  targetCountries: string
  targetRoles: string
  workRightDetails: string
  sponsorshipNeeded: boolean
  relocationWillingness: "yes" | "no" | "depends"
  salaryExpectation: string
  noticePeriod: string
  baseCvText: string
  projectSummaries: string
  experienceHighlights: string
}

export type ReusableAnswers = {
  sponsorshipAnswer: string
  relocationAnswer: string
  workAuthorisationAnswer: string
  noticePeriodAnswer: string
}

export type ApplicationStatus =
  | "Saved"
  | "Applying"
  | "Applied"
  | "Interview"
  | "Rejected"
  | "Closed"

export type ApplicationContentSnapshot = ApplicationContentDraft & {
  savedAt: string
}

type LegacyApplicationStatus =
  | ApplicationStatus
  | "draft"
  | "applied"
  | "interview"
  | "rejected"
  | "offer"
  | "closed"

type JobRecommendation =
  | "High Priority"
  | "Worth Applying"
  | "Stretch"
  | "Skip"

type LegacyJobRecommendation =
  | JobRecommendation
  | "strong-fit"
  | "possible-fit"
  | "low-fit"

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
  contentSnapshot?: ApplicationContentSnapshot
}

export type JobAnalysisDraft = {
  jobTitle: string
  company: string
  jobUrl: string
  location: string
  workMode: "onsite" | "hybrid" | "remote" | "unknown"
  jobDescription: string
  notes: string
  fitScore?: number
  recommendation?: JobRecommendation
  positioningAngle?: string
  scoreFactors?: string[]
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
  contentSnapshot?: ApplicationContentSnapshot
}

type StoredApplicationRecord = Omit<ApplicationRecord, "status"> & {
  status: LegacyApplicationStatus
}

type StoredTrackerDraft = Omit<TrackerDraft, "status"> & {
  status: LegacyApplicationStatus
}

const PROFILE_KEY = "candidate-profile"
const REUSABLE_ANSWERS_KEY = "reusable-answers"
const APPLICATIONS_KEY = "saved-applications"
const JOB_ANALYSIS_KEY = "job-analysis-draft"
const APPLICATION_CONTENT_KEY = "application-content-draft"
const TRACKER_DRAFT_KEY = "tracker-draft"

function normalizeProfile(profile: Partial<CandidateProfile>): CandidateProfile {
  return {
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    linkedInUrl: profile.linkedInUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
    currentCountry: profile.currentCountry ?? "",
    currentCity: profile.currentCity ?? "",
    targetCountries: profile.targetCountries ?? "",
    targetRoles: profile.targetRoles ?? "",
    workRightDetails: profile.workRightDetails ?? "",
    sponsorshipNeeded: profile.sponsorshipNeeded ?? false,
    relocationWillingness: profile.relocationWillingness ?? "depends",
    salaryExpectation: profile.salaryExpectation ?? "",
    noticePeriod: profile.noticePeriod ?? "",
    baseCvText: profile.baseCvText ?? "",
    projectSummaries: profile.projectSummaries ?? "",
    experienceHighlights: profile.experienceHighlights ?? ""
  }
}

function normalizeApplicationStatus(
  status: LegacyApplicationStatus | undefined
): ApplicationStatus {
  switch (status) {
    case "Applying":
    case "Applied":
    case "Interview":
    case "Rejected":
    case "Closed":
    case "Saved":
      return status
    case "applied":
      return "Applied"
    case "interview":
      return "Interview"
    case "rejected":
      return "Rejected"
    case "offer":
    case "closed":
      return "Closed"
    case "draft":
    default:
      return "Saved"
  }
}

function normalizeJobRecommendation(
  recommendation: LegacyJobRecommendation | undefined
): JobRecommendation | undefined {
  switch (recommendation) {
    case "High Priority":
    case "Worth Applying":
    case "Stretch":
    case "Skip":
      return recommendation
    case "strong-fit":
      return "High Priority"
    case "possible-fit":
      return "Worth Applying"
    case "low-fit":
      return "Stretch"
    default:
      return undefined
  }
}

function normalizeJobAnalysisDraft(
  draft: Partial<Omit<JobAnalysisDraft, "recommendation">> & {
    recommendation?: LegacyJobRecommendation
  }
): JobAnalysisDraft {
  const normalized: JobAnalysisDraft = {
    jobTitle: draft.jobTitle ?? "",
    company: draft.company ?? "",
    jobUrl: draft.jobUrl ?? "",
    location: draft.location ?? "",
    workMode: draft.workMode ?? "unknown",
    jobDescription: draft.jobDescription ?? "",
    notes: draft.notes ?? ""
  }

  if (draft.fitScore !== undefined) {
    normalized.fitScore = draft.fitScore
  }

  const recommendation = normalizeJobRecommendation(draft.recommendation)

  if (recommendation !== undefined) {
    normalized.recommendation = recommendation
  }

  if (draft.positioningAngle !== undefined) {
    normalized.positioningAngle = draft.positioningAngle
  }

  if (draft.scoreFactors !== undefined) {
    normalized.scoreFactors = draft.scoreFactors
  }

  return normalized
}

function normalizeTrackerDraft(draft: Partial<StoredTrackerDraft>): TrackerDraft {
  const normalized: TrackerDraft = {
    roleTitle: draft.roleTitle ?? "",
    company: draft.company ?? "",
    applicationUrl: draft.applicationUrl ?? "",
    status: normalizeApplicationStatus(draft.status),
    nextAction: draft.nextAction ?? "",
    nextActionDate: draft.nextActionDate ?? "",
    notes: draft.notes ?? ""
  }

  if (draft.contentSnapshot !== undefined) {
    normalized.contentSnapshot = normalizeApplicationContentSnapshot(
      draft.contentSnapshot
    )
  }

  return normalized
}

function normalizeApplicationRecord(
  application: StoredApplicationRecord
): ApplicationRecord {
  const normalized: ApplicationRecord = {
    ...application,
    status: normalizeApplicationStatus(application.status)
  }

  if (application.contentSnapshot !== undefined) {
    normalized.contentSnapshot = normalizeApplicationContentSnapshot(
      application.contentSnapshot
    )
  }

  return normalized
}

function normalizeApplicationContentSnapshot(
  snapshot: Partial<ApplicationContentSnapshot>
): ApplicationContentSnapshot {
  return {
    coverLetter: snapshot.coverLetter ?? "",
    profileSummary: snapshot.profileSummary ?? "",
    motivationAnswer: snapshot.motivationAnswer ?? "",
    strengthsAnswer: snapshot.strengthsAnswer ?? "",
    availabilityAnswer: snapshot.availabilityAnswer ?? "",
    savedAt: snapshot.savedAt ?? new Date().toISOString()
  }
}

export async function saveProfile(profile: CandidateProfile) {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile })
}

export async function getProfile(): Promise<CandidateProfile | null> {
  const result = await chrome.storage.local.get(PROFILE_KEY)
  const profile = result[PROFILE_KEY] as Partial<CandidateProfile> | undefined
  return profile ? normalizeProfile(profile) : null
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
  const draft = result[JOB_ANALYSIS_KEY] as Partial<JobAnalysisDraft> | undefined
  return draft ? normalizeJobAnalysisDraft(draft) : null
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
  await chrome.storage.local.set({
    [TRACKER_DRAFT_KEY]: normalizeTrackerDraft(draft)
  })
}

export async function getTrackerDraft(): Promise<TrackerDraft | null> {
  const result = await chrome.storage.local.get(TRACKER_DRAFT_KEY)
  const draft = result[TRACKER_DRAFT_KEY] as
    | Partial<StoredTrackerDraft>
    | undefined
  return draft ? normalizeTrackerDraft(draft) : null
}

export async function clearTrackerDraft() {
  await chrome.storage.local.remove(TRACKER_DRAFT_KEY)
}

export async function getApplications(): Promise<ApplicationRecord[]> {
  const result = await chrome.storage.local.get(APPLICATIONS_KEY)
  const applications =
    (result[APPLICATIONS_KEY] as StoredApplicationRecord[] | undefined) ?? []
  return applications.map(normalizeApplicationRecord)
}

export async function saveApplication(record: ApplicationRecord) {
  const existing = await getApplications()
  const updated = [normalizeApplicationRecord(record), ...existing]
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
      | "contentSnapshot"
    >
  >
) {
  const existing = await getApplications()
  const updated = existing.map((record) =>
    record.id === id
      ? normalizeApplicationRecord({ ...record, ...changes })
      : record
  )
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: updated })
}
