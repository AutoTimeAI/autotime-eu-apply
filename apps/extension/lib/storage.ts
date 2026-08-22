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
  salaryExpectationAnswer: string
  motivationAnswer: string
  strengthsAnswer: string
  availabilityAnswer: string
}

export type ApplicationStatus =
  | "Saved"
  | "Checking fit"
  | "Ready to apply"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Archived"

export type ApplicationContentSnapshot = ApplicationContentDraft & {
  savedAt: string
}

export type AIUsageLogEntry = {
  id: string
  featureName: string
  model: string
  approximateCostUsd: number
  createdAt: string
}

export type AccountSession = {
  authToken: string
  refreshToken: string
  expiresAt: number
  email: string
  plan: "free" | "pro"
  provider: string
}

export type DiagnosticLogEntry = {
  id: string
  area: "connect" | "sync" | "widget" | "sidepanel"
  createdAt: string
  details?: Record<string, string | number | boolean | null>
  event: string
  message?: string
  status: "info" | "success" | "warning" | "error"
}

export type ApplicationSyncStatus = "pending" | "synced" | "failed"

export type ApplicationSyncState = {
  attempts: number
  applicationId: string
  lastError?: string
  lastSyncedAt?: string
  lastTriedAt?: string
  status: ApplicationSyncStatus
  updatedAt: string
}

type LegacyApplicationStatus =
  | ApplicationStatus
  | "Applying"
  | "Closed"
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
export type JobReference = { url: string; platform: string; capturedAt: string }

export type JobAnalysisDraft = {
  jobTitle: string
  company: string
  jobUrl: string
  location: string
  workMode: "onsite" | "hybrid" | "remote" | "unknown"
  jobDescription: string
  notes: string
  skills?: string[]
  seniority?: string
  summary?: string
  gaps?: string[]
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
const AI_USAGE_LOG_KEY = "ai-usage-log"
const ACCOUNT_SESSION_KEY = "account-session"
const DIAGNOSTIC_LOG_KEY = "diagnostic-log"
const APPLICATION_SYNC_STATE_KEY = "application-sync-state"
const JOB_REFERENCES_KEY = "job-references"
const LEGACY_OPENAI_SETTINGS_KEY = "openai-settings"
const MAX_DIAGNOSTIC_LOG_ENTRIES = 150

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

function normalizeReusableAnswers(
  answers: Partial<ReusableAnswers>
): ReusableAnswers {
  return {
    sponsorshipAnswer: answers.sponsorshipAnswer ?? "",
    relocationAnswer: answers.relocationAnswer ?? "",
    workAuthorisationAnswer: answers.workAuthorisationAnswer ?? "",
    noticePeriodAnswer: answers.noticePeriodAnswer ?? "",
    salaryExpectationAnswer: answers.salaryExpectationAnswer ?? "",
    motivationAnswer: answers.motivationAnswer ?? "",
    strengthsAnswer: answers.strengthsAnswer ?? "",
    availabilityAnswer: answers.availabilityAnswer ?? ""
  }
}

function normalizeApplicationStatus(
  status: LegacyApplicationStatus | undefined
): ApplicationStatus {
  switch (status) {
    case "Checking fit":
    case "Ready to apply":
    case "Applied":
    case "Interview":
    case "Offer":
    case "Rejected":
    case "Archived":
    case "Saved":
      return status
    case "Applying":
      return "Ready to apply"
    case "applied":
      return "Applied"
    case "interview":
      return "Interview"
    case "offer":
      return "Offer"
    case "rejected":
      return "Rejected"
    case "closed":
    case "Closed":
      return "Archived"
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

  if (draft.skills !== undefined) {
    normalized.skills = draft.skills
  }

  if (draft.seniority !== undefined) {
    normalized.seniority = draft.seniority
  }

  if (draft.summary !== undefined) {
    normalized.summary = draft.summary
  }

  if (draft.gaps !== undefined) {
    normalized.gaps = draft.gaps
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

function normalizeAIUsageLogEntry(
  entry: Partial<AIUsageLogEntry>
): AIUsageLogEntry {
  return {
    id:
      entry.id ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    featureName: entry.featureName ?? "Unknown feature",
    model: entry.model ?? "unknown",
    approximateCostUsd: entry.approximateCostUsd ?? 0,
    createdAt: entry.createdAt ?? new Date().toISOString()
  }
}

function normalizeAccountSession(
  session: Partial<AccountSession>
): AccountSession | null {
  if (!session.authToken?.trim() || !session.email?.trim()) {
    return null
  }

  return {
    authToken: session.authToken,
    refreshToken: session.refreshToken ?? "",
    expiresAt: Number.isFinite(session.expiresAt) ? Number(session.expiresAt) : 0,
    email: session.email,
    plan: session.plan === "pro" ? "pro" : "free",
    provider: session.provider?.trim() || "email"
  }
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

function normalizeDiagnosticDetails(
  details: Record<string, unknown> | undefined
): DiagnosticLogEntry["details"] | undefined {
  if (!details) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(details)
      .filter(([key]) => !/token|secret|password|authorization/i.test(key))
      .map(([key, value]) => {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
        ) {
          return [key, value]
        }

        return [key, String(value)]
      })
  )
}

function normalizeDiagnosticLogEntry(
  entry: Partial<DiagnosticLogEntry>
): DiagnosticLogEntry {
  return {
    id: entry.id ?? createId(),
    area:
      entry.area === "connect" ||
      entry.area === "sync" ||
      entry.area === "widget" ||
      entry.area === "sidepanel"
        ? entry.area
        : "connect",
    createdAt: entry.createdAt ?? new Date().toISOString(),
    details: normalizeDiagnosticDetails(entry.details),
    event: entry.event ?? "unknown",
    message: entry.message,
    status:
      entry.status === "success" ||
      entry.status === "warning" ||
      entry.status === "error"
        ? entry.status
        : "info"
  }
}

function normalizeApplicationSyncState(
  entry: Partial<ApplicationSyncState>,
  applicationId: string
): ApplicationSyncState {
  const now = new Date().toISOString()
  const status =
    entry.status === "synced" || entry.status === "failed"
      ? entry.status
      : "pending"

  return {
    attempts: Number.isFinite(entry.attempts) ? Number(entry.attempts) : 0,
    applicationId,
    lastError: entry.lastError,
    lastSyncedAt: entry.lastSyncedAt,
    lastTriedAt: entry.lastTriedAt,
    status,
    updatedAt: entry.updatedAt ?? now
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
  const answers = result[REUSABLE_ANSWERS_KEY] as
    | Partial<ReusableAnswers>
    | undefined
  return answers ? normalizeReusableAnswers(answers) : null
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

export async function getAIUsageLog(): Promise<AIUsageLogEntry[]> {
  const result = await chrome.storage.local.get(AI_USAGE_LOG_KEY)
  const entries =
    (result[AI_USAGE_LOG_KEY] as Partial<AIUsageLogEntry>[] | undefined) ?? []
  return entries.map(normalizeAIUsageLogEntry)
}

export async function logAIUsage(
  entry: Omit<AIUsageLogEntry, "id" | "createdAt"> &
    Partial<Pick<AIUsageLogEntry, "id" | "createdAt">>
) {
  const existing = await getAIUsageLog()
  const normalizedEntry = normalizeAIUsageLogEntry(entry)
  await chrome.storage.local.set({
    [AI_USAGE_LOG_KEY]: [normalizedEntry, ...existing]
  })
  return normalizedEntry
}

export async function clearAIUsageLog() {
  await chrome.storage.local.remove(AI_USAGE_LOG_KEY)
}

export async function getDiagnosticLog(): Promise<DiagnosticLogEntry[]> {
  const result = await chrome.storage.local.get(DIAGNOSTIC_LOG_KEY)
  const entries =
    (result[DIAGNOSTIC_LOG_KEY] as Partial<DiagnosticLogEntry>[] | undefined) ??
    []

  return entries.map(normalizeDiagnosticLogEntry)
}

export async function logDiagnosticEvent(
  entry: Omit<DiagnosticLogEntry, "createdAt" | "id"> &
    Partial<Pick<DiagnosticLogEntry, "createdAt" | "id">>
) {
  const existing = await getDiagnosticLog()
  const normalizedEntry = normalizeDiagnosticLogEntry(entry)

  await chrome.storage.local.set({
    [DIAGNOSTIC_LOG_KEY]: [normalizedEntry, ...existing].slice(
      0,
      MAX_DIAGNOSTIC_LOG_ENTRIES
    )
  })

  return normalizedEntry
}

export async function clearDiagnosticLog() {
  await chrome.storage.local.remove(DIAGNOSTIC_LOG_KEY)
}

export async function getApplicationSyncState(): Promise<
  Record<string, ApplicationSyncState>
> {
  const result = await chrome.storage.local.get(APPLICATION_SYNC_STATE_KEY)
  const raw =
    (result[APPLICATION_SYNC_STATE_KEY] as
      | Record<string, Partial<ApplicationSyncState>>
      | undefined) ?? {}

  return Object.fromEntries(
    Object.entries(raw).map(([applicationId, entry]) => [
      applicationId,
      normalizeApplicationSyncState(entry, applicationId)
    ])
  )
}

// Read-modify-write over the whole map (chrome.storage.local.get/set are
// real async round trips) - two concurrent calls (e.g. a retry sync and a
// widget-triggered sync racing) would each read the same starting
// snapshot, mutate only their own applicationIds, and whichever writes
// last would silently clobber the other's status updates for its own ids.
// Queuing every call onto a single chain makes each one see the previous
// call's write before it reads, regardless of which code path calls it.
let applicationSyncStateQueue: Promise<unknown> = Promise.resolve()

export async function updateApplicationSyncState(
  applicationIds: string[],
  status: ApplicationSyncStatus,
  options: { error?: string } = {}
) {
  const run = applicationSyncStateQueue.then(() =>
    writeApplicationSyncState(applicationIds, status, options)
  )
  applicationSyncStateQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function writeApplicationSyncState(
  applicationIds: string[],
  status: ApplicationSyncStatus,
  options: { error?: string }
) {
  const existing = await getApplicationSyncState()
  const now = new Date().toISOString()

  for (const applicationId of applicationIds) {
    const current = existing[applicationId]
    existing[applicationId] = {
      attempts:
        status === "pending"
          ? (current?.attempts ?? 0) + 1
          : (current?.attempts ?? 0),
      applicationId,
      lastError: status === "failed" ? options.error : undefined,
      lastSyncedAt: status === "synced" ? now : current?.lastSyncedAt,
      lastTriedAt:
        status === "pending" || status === "failed"
          ? now
          : current?.lastTriedAt,
      status,
      updatedAt: now
    }
  }

  await chrome.storage.local.set({ [APPLICATION_SYNC_STATE_KEY]: existing })
  return existing
}

// The account session (raw auth/refresh tokens) is deliberately kept in
// chrome.storage.session rather than chrome.storage.local. Session storage's
// default access level is TRUSTED_CONTEXTS only (background + extension
// pages) - content scripts, which run injected into every visited website,
// cannot read it or receive its onChanged events at all, even if compromised
// by a malicious page. This is a hard boundary enforced by the browser, not
// just an app-level convention: storing the token in .local would let any
// content-script-context code call chrome.storage.local.get directly and
// bypass whatever message-passing discipline this codebase follows. The
// trade-off: session storage is cleared when the browser fully restarts
// (unlike .local, which persists indefinitely), so a full browser restart
// requires reconnecting the dashboard from the extension's Connect flow.
export async function saveAccountSession(session: AccountSession) {
  await chrome.storage.session.set({ [ACCOUNT_SESSION_KEY]: session })
}

export async function getAccountSession(): Promise<AccountSession | null> {
  const result = await chrome.storage.session.get(ACCOUNT_SESSION_KEY)
  const session = result[ACCOUNT_SESSION_KEY] as
    | Partial<AccountSession>
    | undefined
  return session ? normalizeAccountSession(session) : null
}

export async function clearAccountSession() {
  await chrome.storage.session.remove(ACCOUNT_SESSION_KEY)
}

export async function clearLegacyOpenAISettings() {
  await chrome.storage.local.remove(LEGACY_OPENAI_SETTINGS_KEY)
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
export async function getJobReferences(): Promise<JobReference[]> { const result=await chrome.storage.local.get(JOB_REFERENCES_KEY); return (result[JOB_REFERENCES_KEY] as JobReference[]|undefined)??[] }
export async function saveJobReference(reference: JobReference) { const existing=await getJobReferences(); const without=existing.filter((item)=>item.url!==reference.url); await chrome.storage.local.set({[JOB_REFERENCES_KEY]:[reference,...without]}) }

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
