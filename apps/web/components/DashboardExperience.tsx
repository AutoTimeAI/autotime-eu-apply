"use client"

import Link from "next/link"
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import {
  companionDashboardStateSchema,
  createMockApplicationPositioningPack,
  createMockEUFitEngineResult,
  evaluateCountryFit,
  getCandidateProfileBridgeIssues,
  resolveAIProvider,
  type ApplicationOutcomeReason,
  type ApplicationRecord,
  type ApplicationContentDraft,
  type ApplicationContentSnapshot,
  type ApplicationPositioningPack,
  type ApplicationStatus,
  type AutoTimeFitReview,
  type CandidateProfile,
  type CompanionDashboardState,
  type CountryFitEvaluation,
  type EUFitEngineResult,
  type EvidenceRecord,
  type JobAnalysisDraft,
  type OutcomeRecord,
  type ReusableAnswers
} from "shared"
import {
  createLocalInterviewPrepPack,
  getInterviewPrepGuardrails
} from "../lib/interview-prep"
import {
  createBrowserCloudSyncClient,
  getBrowserCloudSyncReadiness,
  getCloudSyncSessionState,
  type CloudSyncSessionState,
  prepareProfileSyncAction
} from "../lib/cloud-sync"
import {
  PROFILE_EXECUTION_THRESHOLD
} from "../lib/product-protocols"
import {
  evaluateCapabilityReadiness,
  type CapabilityReadinessInput,
  type ProductCapability
} from "../lib/capability-readiness"
import { getStatusTone } from "../lib/status-tone"
import {
  trackDecisionOverride,
  trackFactCorrection,
  trackKitPreparationSaved,
  trackKitPreparationStarted
} from "../lib/analytics"
import { trackWaitlistSubmitted } from "../lib/sentry-breadcrumbs"
import { AccountIdentityLinker } from "./AccountIdentityLinker"
import { CapabilityReadinessNotice } from "./product-ui"
import { useDashboardPlan } from "./UserNav"
import {
  getInterviewBuddyDisclaimer,
  getReusableAnswerLabel,
  inferReusableAnswerKey,
  validateInterviewBuddyInput,
  type ReusableAnswerKey
} from "../domains/interviews/interview-buddy-policy"
import {
  createTechnicalInterviewDrills,
  type TechnicalInterviewDrill,
  type TechnicalInterviewFocus
} from "../domains/interviews/technical-drill-catalogue"
import type { TechnicalInterviewDifficulty } from "../domains/interviews/technical-interview-policy"
import {
  createInterviewBuddyOutputs,
  createLocalInterviewCoachMeta,
  emptyInterviewBuddyOutputs,
  emptyInterviewCoachMeta,
  getProofLibraryContextForInterview,
  interviewQuestionOptions
} from "../domains/interviews/answer-drafting"
import type {
  InterviewBuddyOutputKey,
  InterviewBuddyOutputs,
  InterviewCoachMeta
} from "../domains/interviews/types"
import {
  createApplication,
  getApplicationFitReview,
  getContentGuardrails,
  getDecisionBrief,
  getEvidenceLedgerRows,
  getJobFitReview,
  getOfficialSources,
  getVerificationChecklist,
  type ContentGuardrail,
  type DecisionBrief,
  type OfficialSource,
  type VerificationChecklistItem
} from "../domains/eu-fit"
import {
  createEvidenceRecords,
  getReadyToApplyChecklist
} from "../domains/evidence"
import { createApplicationContentSnapshot } from "../domains/application-preparation/local-content-draft"
import {
  createOutcomeRecord,
  getOutcomeLearningSignals,
  updateOutcomeRecordFromApplication
} from "../domains/outcomes"
import {
  getProfileQualitySignals,
  getProfileSignalStatusLabel
} from "../domains/profile/quality-signals"
import {
  getProfileReadinessScore,
  getReadinessScore
} from "../domains/profile/readiness-score"
import { getHighRiskProfileFieldReason } from "../domains/profile/high-risk-fields"
import {
  defaultDashboardState as defaultState,
  emptyJobAnalysis,
  emptyProfile,
  emptyReusableAnswers,
  getStoredState,
  getUserScopedStorageKey,
  saveState
} from "../platform/persistence/dashboard-state-storage"
import {
  computeMobilityCountryPrefill,
  getBestStoredProfileRecovery
} from "../platform/persistence/profile-recovery"
import {
  defaultSyncPreferences,
  defaultTrustState,
  getStoredSyncPreferences,
  getStoredTrustState,
  saveSyncPreferences,
  saveTrustState,
  type SyncPreferences,
  type TrustState
} from "../platform/persistence/dashboard-preferences-storage"
import {
  candidatePositions,
  defaultProductContext,
  euCountryOptions,
  experienceLevelOptions,
  getStoredProductContext,
  roleMarkets,
  saveProductContext,
  urgencyOptions,
  type CandidateMarketPosition,
  type CandidateUrgency,
  type ProductContext,
  type ResolvedProductContext
} from "../domains/product-context/model"
import {
  findSupportedCountryInText,
  getCountryGuidance,
  getMarketLabel,
  getMarketPositioning,
  getMissingProductContextFields,
  getReadableResumeLines,
  getRoleMarket,
  getUrgencyGuidance,
  includesAny,
  inferCandidateDetailsFromResume,
  inferContextFromResume,
  inferEvidenceFromResume,
  inferRoleMarketFromText,
  inferTargetCountryFromResume,
  normalizeContextSuggestionForApproval,
  resolveProductContext,
  type ContextSuggestion,
  type ContextSuggestionSource
} from "../domains/product-context/resume-inference"
import { CvReviewSuggestionPanel } from "../domains/product-context/components/CvReviewSuggestionPanel"

type DashboardTab = "profile" | "jobs" | "applications" | "interview"
type DashboardWorkflowSnapshot = Pick<
  CompanionDashboardState,
  | "reusableAnswers"
  | "applications"
  | "evidenceRecords"
  | "outcomeRecords"
  | "interviewPrepPacks"
>
type ApplicationContentField = keyof Omit<ApplicationContentSnapshot, "savedAt">
type DashboardFocus =
  | "dashboard"
  | "job-inbox"
  | "match-score"
  | "cv-tailor"
  | "application-answers"
  | "profile-evidence"
  | "application-tracker"
  | "follow-ups"
  | "interview-prep"
  | "insights"
  | "settings"

type ProfileContextReviewResponse = {
  data: { suggestion: ContextSuggestion } | { upgradeUrl: string } | null
  error: string | null
}

function RevealMetric({
  children,
  label = "Reveal value"
}: {
  children: ReactNode
  label?: string
}) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (isRevealed) {
    return <>{children}</>
  }

  return (
    <span
      aria-label={`Reveal value: ${label}`}
      className="metric-reveal-button"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsRevealed(true)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.stopPropagation()
          setIsRevealed(true)
        }
      }}
    >
      Reveal
    </span>
  )
}

function RevealMeter({
  children,
  label = "Show meter"
}: {
  children: ReactNode
  label?: string
}) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (isRevealed) {
    return <>{children}</>
  }

  return (
    <span
      aria-label={`Show meter: ${label}`}
      className="meter-reveal-button"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsRevealed(true)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          event.stopPropagation()
          setIsRevealed(true)
        }
      }}
    >
      Show meter
    </span>
  )
}

type OnlineAnalyticsReport = {
  summary: {
    evidenceRecords: number
    outcomeRecords: number
    interviewSignals: number
    observedInterviewRate: number
    calibrationReady: boolean
    calibrationStatus: string
    minimumRecordsForCalibration: number
  }
  mlReadiness: {
    stage: "collecting" | "early-calibration" | "calibration-ready"
    message: string
    featureRows: number
    minimumRowsForEarlyCalibration: number
    minimumRowsForModelTraining: number
    modelTrainingReady: boolean
    allowedOutput: string
    blockedOutput: string
  }
  evidenceStatus: Record<string, number>
  missingInputs: Record<string, number>
  riskFlags: Record<string, number>
  outcomesByStatus: Record<string, number>
  outcomesByReason: Record<string, number>
  scoreBands: Array<{
    band: string
    records: number
    interviews: number
    observedInterviewRate: number
  }>
  contentGates: Array<{
    gate: string
    records: number
    interviews: number
    observedInterviewRate: number
  }>
  riskSegments: Array<{
    segment: string
    records: number
    interviews: number
    observedInterviewRate: number
  }>
  limits: string[]
}

const walkthroughStorageKey = "autotime-v2-first-login-walkthrough-seen"
const profileExecutionThreshold = PROFILE_EXECUTION_THRESHOLD


const applicationStatuses: ApplicationStatus[] = [
  "Saved",
  "Checking fit",
  "Ready to apply",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Archived"
]

const applicationOutcomeReasons: ApplicationOutcomeReason[] = [
  "Unknown",
  "Interview secured",
  "Offer or final stage",
  "No response",
  "Sponsorship blocker",
  "Work-right blocker",
  "Skill mismatch",
  "Location mismatch",
  "Role closed"
]

const technicalInterviewFocusOptions: Array<{
  id: TechnicalInterviewFocus
  label: string
}> = [
  { id: "systems", label: "Systems thinking" },
  { id: "debugging", label: "Debugging" },
  { id: "api", label: "APIs and integrations" },
  { id: "data", label: "Data and SQL" },
  { id: "delivery", label: "Technical delivery" }
]

const technicalInterviewDifficultyOptions: Array<{
  id: TechnicalInterviewDifficulty
  label: string
}> = [
  { id: "standard", label: "Standard" },
  { id: "advanced", label: "Advanced" },
  { id: "senior", label: "Senior" }
]

const dashboardFocusCopy: Record<
  DashboardFocus,
  { eyebrow: string; title: string; body: string }
> = {
  dashboard: {
    eyebrow: "Dashboard",
    title: "Your EU application workspace",
    body: "Start with your profile, check one role, save job proof, then manage follow-ups from one dashboard."
  },
  "job-inbox": {
    eyebrow: "Tracked Jobs",
    title: "Tracked Jobs",
    body: "Review every role you saved from the extension or Fit Analysis, then update status, outcome and next action."
  },
  "match-score": {
    eyebrow: "EU fit",
    title: "Check EU fit before you apply",
    body: "Check one role against your profile, country context and missing proof before deciding whether to apply."
  },
  "cv-tailor": {
    eyebrow: "Proof Library",
    title: "Proof Library",
    body: "Keep the final reasons and proof you can reuse when applying or preparing for interviews."
  },
  "application-answers": {
    eyebrow: "Application workspace",
    title: "Application Kit",
    body: "Generate job-specific wording from saved proof, then save the useful parts back to Proof Library."
  },
  "profile-evidence": {
    eyebrow: "Profile setup",
    title: "Profile Evidence",
    body: "Add the facts AutoTime needs before it checks jobs, writes proof-backed answers or prepares interviews."
  },
  "application-tracker": {
    eyebrow: "Tracked Jobs",
    title: "Tracked Jobs",
    body: "See tracked jobs, update status and keep next steps visible."
  },
  "follow-ups": {
    eyebrow: "Follow-ups",
    title: "Follow-up Queue",
    body: "See which tracked job needs action next, update the date, then open the job when the status changes."
  },
  "interview-prep": {
    eyebrow: "Interview",
    title: "Interview Prep",
    body: "Turn saved job proof into interview answers and prep packs, then keep reusable reasons in Proof Library."
  },
  insights: {
    eyebrow: "Progress",
    title: "Progress",
    body: "Review what happened across tracked jobs so the next applications become sharper and more evidence-led."
  },
  settings: {
    eyebrow: "Settings",
    title: "Settings",
    body: "Manage account sync, profile controls and dashboard settings."
  }
}

const defaultDashboardFocusByView: Record<
  DashboardTab | "overview",
  DashboardFocus
> = {
  overview: "dashboard",
  profile: "profile-evidence",
  jobs: "match-score",
  applications: "application-tracker",
  interview: "interview-prep"
}


function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function formatDashboardDate(value?: string) {
  if (!value) {
    return "Not set"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Needs review"
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function getApplicationSourceLabel(application: ApplicationRecord) {
  return application.source || getHostname(application.url) || "Manual entry"
}

function getApplicationCaptureMode(application: ApplicationRecord) {
  const wasEditedAfterCapture = Boolean(
    application.updatedAt &&
    new Date(application.updatedAt).getTime() -
      new Date(application.createdAt).getTime() >
      1000
  )

  if (wasEditedAfterCapture && hasApplicationJobText(application)) {
    return {
      className: "edited",
      detail: "Captured job was edited after initial save",
      label: "Edited after capture"
    }
  }

  if (/\b(import|csv|json|backup)\b/i.test(application.source ?? "")) {
    return {
      className: "imported",
      detail: "Imported into dashboard from an external file or backup",
      label: "Imported"
    }
  }

  if (
    application.notes?.includes("Platform:") ||
    application.notes?.includes("Page title:")
  ) {
    return {
      className: "automatic",
      detail: "Parsed from browser extension",
      label: "Extension parsed"
    }
  }

  if (hasApplicationJobText(application)) {
    return {
      className: "tracked",
      detail: "Loaded from saved tracker text",
      label: "Tracked job"
    }
  }

  return {
    className: "manual",
    detail: "Created or edited in dashboard",
    label: "Manual dashboard"
  }
}

function hasJobDraft(job: JobAnalysisDraft) {
  return Boolean(
    job.jobTitle.trim() ||
    job.company.trim() ||
    job.jobDescription.trim() ||
    job.jobUrl.trim()
  )
}

function hasApplicationJobText(application: ApplicationRecord) {
  return Boolean(
    application.notes?.trim() && application.notes.trim().length > 80
  )
}

function inferWorkModeFromApplication(
  application: ApplicationRecord
): JobAnalysisDraft["workMode"] {
  const text = [application.title, application.roleTitle, application.notes]
    .filter(Boolean)
    .join(" ")

  if (/\bhybrid\b/i.test(text)) {
    return "hybrid"
  }

  if (/\bremote|work from home|telecommute\b/i.test(text)) {
    return "remote"
  }

  if (/\bon-?site|office based|office-based\b/i.test(text)) {
    return "onsite"
  }

  return "unknown"
}

function createJobAnalysisFromApplication(
  application: ApplicationRecord
): JobAnalysisDraft {
  const captureMode = getApplicationCaptureMode(application)

  return {
    ...emptyJobAnalysis,
    jobTitle: application.roleTitle || application.title,
    company: application.company ?? "",
    jobUrl: application.url,
    location: "",
    workMode: inferWorkModeFromApplication(application),
    jobDescription: application.notes ?? "",
    notes: [
      `Input mode: ${captureMode.label}`,
      application.source && `Source: ${application.source}`,
      application.status && `Tracker status: ${application.status}`,
      application.nextAction && `Next action: ${application.nextAction}`
    ]
      .filter(Boolean)
      .join("\n")
  }
}


function formatProviderLabel(provider: string): string {
  switch (provider) {
    case "github":
      return "GitHub"
    case "google":
      return "Google"
    case "email":
      return "Email sign-in"
    default:
      return provider
  }
}

function getStatusCounts(applications: ApplicationRecord[]) {
  return applicationStatuses.reduce(
    (counts, status) => ({
      ...counts,
      [status]: applications.filter(
        (application) => application.status === status
      ).length
    }),
    {} as Record<ApplicationStatus, number>
  )
}

function hasFollowUpAction(application: ApplicationRecord) {
  return (
    application.status !== "Archived" &&
    application.status !== "Rejected" &&
    Boolean(
      application.nextAction?.trim() ||
        application.nextActionDate ||
        ["Applied", "Interview", "Offer"].includes(application.status)
    )
  )
}

function getNextActionCount(applications: ApplicationRecord[]) {
  return applications.filter(hasFollowUpAction).length
}

function getNextActionTiming(application: ApplicationRecord) {
  if (!application.nextActionDate) {
    return application.nextAction?.trim() ? "No date" : "No action"
  }

  const dueAt = new Date(`${application.nextActionDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((dueAt.getTime() - today.getTime()) / 86400000)

  if (Number.isNaN(days)) {
    return "Date needs review"
  }

  if (days < 0) {
    return `${Math.abs(days)}d overdue`
  }

  if (days === 0) {
    return "Due today"
  }

  return `${days}d left`
}

function getOutcomeAnalytics(outcomeRecords: OutcomeRecord[]) {
  const tracked = outcomeRecords.filter(
    (record) => record.outcomeReason !== "Unknown" || record.status !== "Saved"
  )
  const interviews = outcomeRecords.filter(
    (record) =>
      record.status === "Interview" ||
      record.outcomeReason === "Interview secured"
  )
  const blockers = outcomeRecords.filter((record) =>
    [
      "Sponsorship blocker",
      "Work-right blocker",
      "Skill mismatch",
      "Location mismatch"
    ].includes(record.outcomeReason)
  )

  return {
    total: outcomeRecords.length,
    tracked: tracked.length,
    interviews: interviews.length,
    blockers: blockers.length,
    calibrationReady: outcomeRecords.length >= 30
  }
}

function getRiskLabel(state: CompanionDashboardState) {
  if (!state.profile.workRightDetails.trim()) {
    return "Work-right details missing"
  }

  if ((state.jobAnalysis.gaps?.length ?? 0) > 0) {
    return "Role risks logged"
  }

  return "No critical gaps logged"
}

export default function HomePage({
  applicationId,
  focus,
  view = "overview"
}: {
  applicationId?: string
  focus?: DashboardFocus
  view?: DashboardTab | "overview"
}) {
  const { userId } = useDashboardPlan()
  const [state, setState] = useState<CompanionDashboardState>(defaultState)
  const [mobilityPrefillNote, setMobilityPrefillNote] = useState<{
    currentCountry: boolean
    targetCountries: boolean
  }>({ currentCountry: false, targetCountries: false })
  const [importJson, setImportJson] = useState("")
  const [status, setStatus] = useState("")
  const [productContext, setProductContext] = useState<ProductContext>(
    defaultProductContext
  )
  const [resumeIntake, setResumeIntake] = useState("")
  const [contextSuggestion, setContextSuggestion] =
    useState<ContextSuggestion | null>(null)
  const [contextSuggestionSource, setContextSuggestionSource] =
    useState<ContextSuggestionSource>(null)
  const [contextSuggestionNote, setContextSuggestionNote] = useState("")
  const [isReviewingCv, setIsReviewingCv] = useState(false)
  const [isSavingApplication, setIsSavingApplication] = useState(false)
  const [deletingApplicationIds, setDeletingApplicationIds] = useState<
    string[]
  >([])
  const canReviewResumeWithAi = resumeIntake.trim().length >= 40
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null)
  const [interviewQuestion, setInterviewQuestion] = useState(
    interviewQuestionOptions[0]
  )
  const [customInterviewQuestion, setCustomInterviewQuestion] = useState("")
  const [interviewDraftAnswer, setInterviewDraftAnswer] = useState("")
  const [interviewBuddyOutputs, setInterviewBuddyOutputs] =
    useState<InterviewBuddyOutputs>(emptyInterviewBuddyOutputs)
  const [interviewCoachMeta, setInterviewCoachMeta] =
    useState<InterviewCoachMeta>(emptyInterviewCoachMeta)
  const [technicalInterviewDifficulty, setTechnicalInterviewDifficulty] =
    useState<TechnicalInterviewDifficulty>("advanced")
  const [technicalInterviewFocus, setTechnicalInterviewFocus] =
    useState<TechnicalInterviewFocus>("systems")
  const [technicalInterviewDrills, setTechnicalInterviewDrills] = useState<
    TechnicalInterviewDrill[]
  >([])
  const [isCopilotThinking, setIsCopilotThinking] = useState(false)
  const [cloudSyncConsent, setCloudSyncConsent] = useState(false)
  const [cloudSyncSessionState, setCloudSyncSessionState] =
    useState<CloudSyncSessionState | null>(null)
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(
    defaultSyncPreferences
  )
  const [trustState, setTrustState] = useState<TrustState>(defaultTrustState)
  const [showFirstRunWalkthrough, setShowFirstRunWalkthrough] = useState(false)
  const kitPreparationStartedAtRef = useRef<Record<string, number>>({})
  const applicationSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const profileSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const hasUnsyncedDashboardChangesRef = useRef(false)
  const hasUnsyncedProfileChangesRef = useRef(false)
  const [onlineAnalyticsReport, setOnlineAnalyticsReport] =
    useState<OnlineAnalyticsReport | null>(null)
  const [onlineAnalyticsStatus, setOnlineAnalyticsStatus] = useState("")
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("")
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all")
  const [applicationOutcomeFilter, setApplicationOutcomeFilter] = useState<
    ApplicationOutcomeReason | "all"
  >("all")
  const [kitApplicationId, setKitApplicationId] = useState("")
  const [kitDraft, setKitDraft] = useState<ApplicationContentSnapshot | null>(
    null
  )
  const autoTimeFitReview = useMemo(
    () =>
      getJobFitReview({
        profile: state.profile,
        job: state.jobAnalysis
      }),
    [state.profile, state.jobAnalysis]
  )
  const fitScore = autoTimeFitReview.fitScore
  const outcomeLearningSignals = useMemo(
    () => getOutcomeLearningSignals(state.applications),
    [state.applications]
  )
  const resolvedProductContext = useMemo(
    () => resolveProductContext(productContext),
    [productContext]
  )
  const missingProductContextFields = useMemo(
    () => getMissingProductContextFields(productContext),
    [productContext]
  )
  const canApplyMarketContext = missingProductContextFields.length === 0
  const profileQualitySignals = useMemo(
    () => getProfileQualitySignals(state.profile, state.reusableAnswers),
    [state.profile, state.reusableAnswers]
  )
  const profileQualityScore = Math.round(
    profileQualitySignals.reduce((sum, item) => sum + item.score, 0) /
      profileQualitySignals.length
  )
  const fitEvaluation = useMemo(
    () =>
      evaluateCountryFit({
        profile: state.profile,
        job: {
          ...state.jobAnalysis,
          fitScore
        },
        context: {
          candidatePosition: resolvedProductContext.candidatePosition,
          targetCountry: resolvedProductContext.targetCountry,
          outcomeSignals: outcomeLearningSignals
        }
      }),
    [
      state.profile,
      state.jobAnalysis,
      resolvedProductContext,
      fitScore,
      outcomeLearningSignals
    ]
  )
  const readinessScore = useMemo(() => getReadinessScore(state), [state])
  const statusCounts = useMemo(
    () => getStatusCounts(state.applications),
    [state.applications]
  )
  const activeActionCount = useMemo(
    () => getNextActionCount(state.applications),
    [state.applications]
  )
  const filteredApplications = useMemo(() => {
    const query = applicationSearchQuery.trim().toLowerCase()

    return state.applications.filter((application) => {
      const matchesStatus =
        applicationStatusFilter === "all" ||
        application.status === applicationStatusFilter
      const matchesOutcome =
        applicationOutcomeFilter === "all" ||
        (application.outcomeReason ?? "Unknown") === applicationOutcomeFilter
      const matchesQuery =
        !query ||
        [
          application.roleTitle,
          application.title,
          application.company,
          application.source,
          application.url,
          application.nextAction,
          application.notes
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query))

      return matchesStatus && matchesOutcome && matchesQuery
    })
  }, [
    applicationOutcomeFilter,
    applicationSearchQuery,
    applicationStatusFilter,
    state.applications
  ])
  const trackedJobSourceOptions = useMemo(
    () => state.applications.filter(hasApplicationJobText).slice(0, 12),
    [state.applications]
  )
  const latestTrackedJobSource = trackedJobSourceOptions[0] ?? null
  const currentJobInputMode = state.jobAnalysis.notes.includes(
    "Input mode: Extension parsed"
  )
    ? {
        className: "automatic",
        detail: "Loaded from extension-parsed job details",
        label: "Extension parsed"
      }
    : state.jobAnalysis.notes.includes("Input mode: Tracked job")
      ? {
          className: "tracked",
          detail: "Loaded from a saved tracker record",
          label: "Tracked job"
        }
      : {
          className: "manual",
          detail: "Manual dashboard fields or paste fallback",
          label: "Manual dashboard"
        }
  const riskLabel = useMemo(() => getRiskLabel(state), [state])
  const decisionBrief = useMemo(
    () =>
      getDecisionBrief({
        autoTimeFitReview,
        targetCountry: resolvedProductContext.targetCountry,
        marketLabel: getMarketLabel(resolvedProductContext),
        urgencyGuidance: getUrgencyGuidance(resolvedProductContext),
        state,
        fitEvaluation,
        readinessScore
      }),
    [
      autoTimeFitReview,
      resolvedProductContext,
      state,
      fitEvaluation,
      readinessScore
    ]
  )
  const officialSources = useMemo(
    () => getOfficialSources(resolvedProductContext.targetCountry),
    [resolvedProductContext.targetCountry]
  )
  const officialSourceStatusLabel = trustState.officialSourceReviewed
    ? "Official source reviewed"
    : "Official source check needed"
  const evidenceLedgerRows = useMemo(
    () => getEvidenceLedgerRows(fitEvaluation, decisionBrief.missingInputs),
    [fitEvaluation, decisionBrief.missingInputs]
  )
  const verificationChecklist = useMemo(
    () =>
      getVerificationChecklist({
        state,
        fitEvaluation,
        officialSources,
        trustState
      }),
    [state, fitEvaluation, officialSources, trustState]
  )
  const contentGuardrails = useMemo(
    () =>
      getContentGuardrails({
        decisionBrief,
        verificationChecklist
      }),
    [decisionBrief, verificationChecklist]
  )
  const euFitEngineResult: EUFitEngineResult = useMemo(
    () =>
      createMockEUFitEngineResult({
        evaluation: fitEvaluation,
        fitReview: autoTimeFitReview,
        job: state.jobAnalysis,
        profile: state.profile,
        provider: "mock",
        officialSourceReviewed: trustState.officialSourceReviewed
      }),
    [
      autoTimeFitReview,
      fitEvaluation,
      state.jobAnalysis,
      state.profile,
      trustState.officialSourceReviewed
    ]
  )
  const profileBridgeIssues = useMemo(
    () => getCandidateProfileBridgeIssues(state.profile),
    [state.profile]
  )
  const profileReadyForExecution = readinessScore >= profileExecutionThreshold
  const profileGateItems = [
    ...profileBridgeIssues.map((issue) => `Add ${issue}`),
    ...(profileReadyForExecution
      ? []
      : ["Add enough profile evidence to unlock job checks"])
  ]
  const cloudSyncReadiness = useMemo(() => getBrowserCloudSyncReadiness(), [])
  const interviewApplications = state.applications.filter(
    (application) => application.status === "Interview"
  )
  const persistedEvidenceRecords = state.evidenceRecords ?? []
  const persistedOutcomeRecords = useMemo(
    () => state.outcomeRecords ?? [],
    [state.outcomeRecords]
  )
  const selectedApplication = applicationId
    ? state.applications.find((application) => application.id === applicationId)
    : undefined
  const selectedApplicationFitReview = useMemo(() => {
    if (!selectedApplication) {
      return null
    }

    return getApplicationFitReview({
      application: selectedApplication,
      job: createJobAnalysisFromApplication(selectedApplication),
      profile: state.profile
    })
  }, [selectedApplication, state.profile])
  const selectedApplicationEvidence = selectedApplication
    ? persistedEvidenceRecords.filter(
        (record) => record.applicationId === selectedApplication.id
      )
    : []
  const selectedInterviewPrepPack = selectedApplication
    ? state.interviewPrepPacks.find(
        (pack) => pack.applicationId === selectedApplication.id
      )
    : undefined
  const selectedReadyChecklist = selectedApplication
    ? getReadyToApplyChecklist({
        application: selectedApplication,
        evidenceRecords: persistedEvidenceRecords,
        profile: state.profile
      })
    : []
  const selectedReadyStatus = selectedReadyChecklist.some(
    (item) => item.status === "blocked"
  )
    ? "Blocked"
    : selectedReadyChecklist.some((item) => item.status === "needs-check")
      ? "Needs tailoring"
      : "Ready to apply"
  const activeKitApplication =
    state.applications.find((application) => application.id === kitApplicationId) ??
    state.applications[0]
  const applicationKitProvider = resolveAIProvider({
    requestedProvider: "mock",
    openAIKeyAvailable: false
  })
  const applicationPositioningPack = useMemo(
    () =>
      createMockApplicationPositioningPack({
        fitResult: euFitEngineResult,
        job: state.jobAnalysis,
        profile: state.profile,
        provider: applicationKitProvider,
        reusableAnswers: state.reusableAnswers
      }),
    [
      applicationKitProvider,
      euFitEngineResult,
      state.jobAnalysis,
      state.profile,
      state.reusableAnswers
    ]
  )
  const hasCurrentJobDraft = hasJobDraft(state.jobAnalysis)
  const followUpApplications = state.applications.filter(hasFollowUpAction)
  const outcomeAnalytics = useMemo(
    () => getOutcomeAnalytics(persistedOutcomeRecords),
    [persistedOutcomeRecords]
  )
  const currentTab: DashboardTab = view === "overview" ? "profile" : view
  const isOverview = view === "overview"
  const activeFocus = focus ?? defaultDashboardFocusByView[view]
  const focusCopy = dashboardFocusCopy[activeFocus]
  const actionPanelEyebrow = isOverview
    ? "Quick actions"
    : currentTab === "jobs"
      ? "EU fit"
      : activeFocus === "cv-tailor"
        ? "Proof Library"
        : activeFocus === "follow-ups"
          ? "Follow-ups"
          : activeFocus === "insights"
            ? "Progress"
      : currentTab === "profile"
        ? "Profile Evidence"
        : currentTab === "applications"
          ? "Tracked Jobs"
          : "Interview Prep"
  const showHeaderJobActions =
    profileReadyForExecution && isOverview
  const showActionPanel =
    !isOverview &&
    currentTab !== "jobs" &&
    activeFocus !== "profile-evidence" &&
    activeFocus !== "application-tracker"
  const showExecutivePanel =
    isOverview || (profileReadyForExecution && currentTab === "jobs")
  const showProfileSettingsPanel =
    activeFocus === "profile-evidence" || activeFocus === "settings"
  const showApplicationAnalytics =
    activeFocus === "insights" && !selectedApplication
  const showFollowUpQueue = activeFocus === "follow-ups" && !selectedApplication
  const showApplicationList =
    activeFocus !== "insights" && !showFollowUpQueue && !selectedApplication
  const showInterviewPrepPacks = activeFocus === "interview-prep"
  const isProfileGateRequired = false
  const isDashboardProtocolLocked = false
  const canSaveCheckedJob = hasJobDraft(state.jobAnalysis)
  const decisionTone =
    decisionBrief.contentGate === "ready"
      ? "good"
      : decisionBrief.contentGate === "stretch"
        ? "warn"
        : "blocked"
  const contentGateResult =
    decisionBrief.contentGate === "ready"
      ? "No content blocker detected by current rules"
      : decisionBrief.contentGate === "stretch"
        ? "Stretch application: label the risk"
        : "Do not write content yet"
  const primaryRisk =
    decisionBrief.risks[0] ||
    decisionBrief.missingInputs[0] ||
    "No major blocker is visible from the saved evidence."
  const primaryEvidence =
    decisionBrief.evidenceFound[0] || "No strong evidence found yet."
  const fitOutcomeCards = [
    {
      label: "Apply decision",
      value: euFitEngineResult.applyDecision,
      tone: decisionTone,
      detail: contentGateResult
    },
    {
      label: "Right-to-work",
      value:
        euFitEngineResult.officialVerificationStatus === "user_verified"
          ? "User checked"
          : "Needs check",
      tone:
        euFitEngineResult.officialVerificationStatus === "user_verified"
          ? "good"
          : "warn",
      detail: euFitEngineResult.rightToWorkRealityCheck
    },
    {
      label: "Risk result",
      value: fitEvaluation.blockers.length
        ? `${fitEvaluation.blockers.length} blocker${fitEvaluation.blockers.length === 1 ? "" : "s"}`
        : decisionBrief.risks.length
          ? `${decisionBrief.risks.length} check${decisionBrief.risks.length === 1 ? "" : "s"}`
          : "No blocker",
      tone: fitEvaluation.blockers.length
        ? "blocked"
        : decisionBrief.risks.length
          ? "warn"
          : "good",
      detail: primaryRisk
    },
    {
      label: "Language barrier",
      value: `${euFitEngineResult.languageBarrierScore}/100`,
      tone: euFitEngineResult.languageBarrierScore >= 60 ? "warn" : "good",
      detail:
        "Lower is easier; verify employer language requirements before applying."
    },
    {
      label: "Evidence result",
      value: `${euFitEngineResult.positiveSignals.length} signal${euFitEngineResult.positiveSignals.length === 1 ? "" : "s"}`,
      tone: decisionBrief.missingInputs.length ? "warn" : "good",
      detail: euFitEngineResult.positiveSignals[0] || primaryEvidence
    },
    {
      label: "Next action",
      value:
        decisionBrief.contentGate === "ready"
          ? "Ready to save"
          : decisionBrief.contentGate === "stretch"
            ? "Review stretch"
            : "Fix first",
      tone: decisionTone,
      detail: decisionBrief.nextActions[0]
    }
  ]
  const fitTrustCards = [
    {
      label: officialSourceStatusLabel,
      value: "Official source check",
      tone: trustState.officialSourceReviewed ? "good" : "warn",
      detail:
        "Official sources and employer wording must be checked before relying on work-right, sponsorship, relocation or location-fit advice."
    },
    {
      label: "Review control",
      value: "You approve changes",
      tone: "neutral",
      detail: "Check the result before saving or using it."
    }
  ]
  const positioningResultCards = [
    {
      label: "Positioning outcome",
      value:
        euFitEngineResult.applicationPriority === "Skip"
          ? "Blocked angle"
          : "Best angle",
      tone: decisionTone,
      detail: euFitEngineResult.bestApplicationAngle
    },
    {
      label: "CV gap",
      value: "Improve proof",
      tone: decisionTone,
      detail: euFitEngineResult.candidatePositioningGap
    },
    {
      label: "Action outcome",
      value: "Next move",
      tone: decisionTone,
      detail: euFitEngineResult.cvImprovementSuggestion
    },
    {
      label: "Interview note",
      value: "Prepare",
      tone: decisionTone,
      detail: euFitEngineResult.interviewReadinessNote
    }
  ]
  const followUpTone = activeActionCount > 0 ? "warn" : "good"
  const commandCentreCards = [
    {
      title: "To do",
      value: activeActionCount > 0 ? `${activeActionCount} actions` : "Clear",
      hideMetric: activeActionCount > 0,
      tone: followUpTone,
      progress: activeActionCount > 0 ? 66 : 100,
      body:
        activeActionCount > 0
          ? "Open Follow-ups and clear the next dated action."
          : "No dated actions are waiting."
    },
    {
      title: "Latest job check",
      value: hasCurrentJobDraft
        ? `${autoTimeFitReview.fitScore}/100`
        : "Not checked",
      hideMetric: hasCurrentJobDraft,
      tone: hasCurrentJobDraft ? decisionTone : "neutral",
      progress: hasCurrentJobDraft ? autoTimeFitReview.fitScore : 0,
      body: hasCurrentJobDraft
        ? autoTimeFitReview.fitLabel
        : "Check one saved job before reading fit."
    },
    {
      title: "Profile",
      value: `${readinessScore}%`,
      hideMetric: true,
      tone:
        readinessScore >= 80
          ? "good"
          : readinessScore >= 50
            ? "warn"
            : "blocked",
      progress: readinessScore,
      body:
        decisionBrief.missingInputs.length > 0
          ? "Add the missing profile details first."
          : "Ready to check jobs."
    },
    {
      title: "Job risk",
      value: hasCurrentJobDraft ? riskLabel : "No job checked",
      hideMetric: false,
      tone: hasCurrentJobDraft ? decisionTone : "neutral",
      progress: hasCurrentJobDraft
        ? decisionBrief.contentGate === "ready"
          ? 100
          : decisionBrief.contentGate === "stretch"
            ? 62
            : 28
        : 0,
      body:
        !hasCurrentJobDraft
          ? "Check a role before reviewing blockers."
          : decisionBrief.contentGate === "ready"
          ? "No major blocker found."
          : decisionBrief.contentGate === "stretch"
            ? "This looks like a stretch role."
            : "Review blockers before applying."
    },
    {
      title: "Tracked Jobs",
      value: `${state.applications.length} jobs`,
      hideMetric: state.applications.length > 0,
      tone: state.applications.length > 0 ? "good" : "neutral",
      progress: Math.min(100, state.applications.length * 24),
      body:
        statusCounts.Applied + statusCounts.Interview > 0
          ? "Some jobs have moved forward."
          : "Saved jobs appear here after you track them."
    },
    {
      title: "Follow-ups",
      value: `${activeActionCount}`,
      hideMetric: activeActionCount > 0,
      tone: followUpTone,
      progress: activeActionCount > 0 ? 45 : 100,
      body:
        activeActionCount > 0
          ? "Open the queue and handle the next action."
          : "No follow-ups are due."
    },
    {
      title: "Interview",
      value: `${state.interviewPrepPacks.length} prep packs`,
      hideMetric: state.interviewPrepPacks.length > 0,
      tone: state.interviewPrepPacks.length > 0 ? "good" : "neutral",
      progress: Math.min(100, state.interviewPrepPacks.length * 34),
      body: "Prepare from saved proof when a job reaches interview."
    }
  ]
  const onboardingSteps = [
    {
      href: "/dashboard/profile-evidence",
      step: "Step 1",
      title: "Complete Profile Evidence",
      status: profileReadyForExecution ? "Ready" : "Needs evidence",
      hideStatusMetric: !profileReadyForExecution,
      detail: profileReadyForExecution
        ? "Your facts are ready for job checks, proof and interview prep."
        : "Add the required facts first so the rest of the product can stay specific.",
      cta: profileReadyForExecution ? "Review profile" : "Complete profile",
      tone: profileReadyForExecution
        ? "good"
        : readinessScore >= 50
          ? "warn"
          : "blocked"
    },
    {
      href: "/dashboard/extension",
      step: "Step 2",
      title: "Save a job",
      status:
        state.applications.length > 0 ? "Capturing jobs" : "Not connected",
      hideStatusMetric: false,
      detail:
        state.applications.length > 0
          ? "Saved jobs are reaching your dashboard."
          : "Use the extension or Fit Analysis to save one real role.",
      cta:
        state.applications.length > 0 ? "View saved jobs" : "Save a job",
      tone: state.applications.length > 0 ? "good" : "neutral"
    },
    {
      href: "/dashboard/match-score",
      step: "Step 3",
      title: "Check fit",
      status: hasJobDraft(state.jobAnalysis)
        ? `${fitEvaluation.overallScore}/100 match`
        : "Waiting for a role",
      hideStatusMetric: hasJobDraft(state.jobAnalysis),
      detail: hasJobDraft(state.jobAnalysis)
        ? fitEvaluation.decision
        : "Choose a saved job or paste a job description before applying.",
      cta: "Check EU fit",
      tone: hasJobDraft(state.jobAnalysis) ? decisionTone : "neutral"
    },
    {
      href: "/dashboard/application-answers",
      step: "Step 4",
      title: "Save job proof",
      status:
        state.applications.length > 0
          ? `${state.applications.length} saved`
          : "No tracked jobs yet",
      hideStatusMetric: state.applications.length > 0,
      detail:
        state.applications.length > 0
          ? "Generate wording, review it, then save the useful reasons to Proof Library."
          : "Save one checked job before generating proof-backed wording.",
      cta: "Open Application Kit",
      tone:
        state.applications.length > 0
          ? "good"
          : "neutral"
    },
    {
      href: "/dashboard/follow-ups",
      step: "Step 5",
      title: "Work the next action",
      status: activeActionCount > 0 ? `${activeActionCount} waiting` : "Clear",
      hideStatusMetric: activeActionCount > 0,
      detail:
        activeActionCount > 0
          ? "Handle follow-ups, recruiter replies or status checks from one queue."
          : "No dated action is waiting; review saved jobs or check another role.",
      cta: "Open follow-ups",
      tone: activeActionCount > 0 ? "warn" : "good"
    }
  ]
  const strategicQualitySignals = [
    {
      label: "Target roles",
      value: getMarketLabel(productContext) ?? "European tech",
      detail: canApplyMarketContext
        ? `${productContext.targetCountry} / ${productContext.experienceLevel} / ${productContext.urgency}`
        : "Choose CV-backed direction before applying profile settings."
    },
    {
      label: "Country-aware fit",
      value: fitEvaluation.countryRule.name,
      detail: fitEvaluation.countryRule.marketNote
    },
    {
      label: "Profile proof",
      value: profileReadyForExecution ? "Ready" : `${readinessScore}%`,
      detail: profileReadyForExecution
        ? "Profile is ready for job checks and interview prep."
        : "Complete Profile Evidence before relying on role decisions."
    },
    {
      label: "Interview prep",
      value: interviewApplications.length > 0 ? "Active" : "Build",
      detail:
        interviewApplications.length > 0
          ? "Use saved fit evidence to prepare stronger interview answers."
          : "Turn quality applications into interview-ready proof."
    }
  ]
  const todayAction = !profileReadyForExecution
    ? {
        body: "Locked until your profile has enough detail for job checks, tracker actions and interview answers.",
        cta: "Unlock profile",
        href: "/dashboard/profile-evidence",
        label: "Locked",
        title: "Evidence gate is active"
      }
    : state.applications.length === 0
      ? {
          body: "Check one role manually or import it from the extension. Tracked jobs will appear in your tracker.",
          cta: "Check EU fit",
          href: "/dashboard/match-score",
          label: "Next step",
          title: "Save your first job"
        }
      : activeActionCount > 0
        ? {
            body: "Saved roles need a follow-up or status update.",
            cta: "Open follow-ups",
            href: "/dashboard/follow-ups",
            label: "Next step",
            title: "Handle the next action"
          }
        : {
            body: "Your tracked jobs are tidy. Review recent roles or check another job when you are ready.",
            cta: "Review tracker",
            href: "/dashboard/applications",
            label: "Next step",
            title: "Keep your tracker tidy"
          }

  const loadDashboardSnapshot = useCallback(
    async ({
      force = false,
      silent = false,
      successMessage = "Synced dashboard workflow loaded"
    }: {
      force?: boolean
      silent?: boolean
      successMessage?: string
    } = {}) => {
      if (!cloudSyncReadiness.configured) {
        if (!silent) {
          setStatus(
            `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
          )
        }
        return false
      }

      if (!force && silent && hasUnsyncedDashboardChangesRef.current) {
        return false
      }

      try {
        const response = await fetch("/api/sync/dashboard", {
          cache: "no-store"
        })
        const body = (await response.json()) as {
          data: {
            dashboard: DashboardWorkflowSnapshot
          } | null
          error: string | null
        }

        if (!response.ok || body.error) {
          console.error("Dashboard action failed: load dashboard response", {
            error: body.error ?? "Dashboard sync read failed",
            httpStatus: response.status,
            route: "/api/sync/dashboard"
          })
          if (!silent) {
            setStatus(body.error ?? "Could not load synced dashboard")
          }
          reportClientDiagnostic(
            "sync.dashboard.client.read-response-failed",
            body.error ?? "Dashboard sync read response failed",
            {
              httpStatus: response.status,
              operation: "dashboard-read",
              route: "/api/sync/dashboard"
            }
          )
          return false
        }

        if (!body.data?.dashboard) {
          setCloudSyncSessionState((current) =>
            current ?? {
              checked: true,
              authenticated: false,
              userEmail: null,
              provider: null,
              message: "No synced jobs found for this account yet"
            }
          )
          if (!silent) {
            setStatus("No synced jobs found for this account yet")
          }
          return false
        }

        const dashboard = body.data.dashboard
        setState((current) => {
          const nextState = {
            ...current,
            ...dashboard,
            evidenceRecords: dashboard.evidenceRecords ?? [],
            outcomeRecords: dashboard.outcomeRecords ?? []
          }
          saveState(nextState, userId)
          return nextState
        })

        if (!silent) {
          setStatus(successMessage)
        }
        return true
      } catch (error: unknown) {
        console.error("Dashboard action failed: load dashboard fetch", error)
        if (!silent) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not load synced dashboard"
          )
        }
        reportClientDiagnostic(
          "sync.dashboard.client.read-fetch-failed",
          error instanceof Error
            ? error.message
            : "Dashboard sync read fetch failed",
          {
            operation: "dashboard-read",
            route: "/api/sync/dashboard"
          }
        )
        return false
      }
    },
    [cloudSyncReadiness, userId]
  )

  const loadProfileSnapshot = useCallback(
    async ({
      silent = false,
      successMessage = "Synced profile loaded into this browser"
    }: {
      silent?: boolean
      successMessage?: string
    } = {}) => {
      if (!cloudSyncReadiness.configured) {
        if (!silent) {
          setStatus(
            `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
          )
        }
        return false
      }

      if (silent && hasUnsyncedProfileChangesRef.current) {
        return false
      }

      try {
        const response = await fetch("/api/sync/profile", {
          cache: "no-store"
        })
        const body = (await response.json()) as {
          data: { profile: CandidateProfile | null } | null
          error: string | null
        }

        if (!response.ok || body.error) {
          console.error("Dashboard action failed: load profile response", {
            error: body.error ?? "Profile sync read failed",
            httpStatus: response.status,
            route: "/api/sync/profile"
          })
          if (!silent) {
            setStatus(body.error ?? "Could not load synced profile")
          }
          reportClientDiagnostic(
            "sync.profile.client.read-response-failed",
            body.error ?? "Profile sync read response failed",
            {
              httpStatus: response.status,
              operation: "profile-read",
              route: "/api/sync/profile"
            }
          )
          return false
        }

        if (!body.data?.profile) {
          if (!silent) {
            setStatus("No synced profile found for this account yet")
          }
          return false
        }

        const syncedProfile = body.data.profile
        const syncedReadiness = getProfileReadinessScore(syncedProfile)
        let profileLoadMessage: string | null = null

        setState((current) => {
          const currentReadiness = getReadinessScore(current)
          const recovered =
            currentReadiness <= 15 && syncedReadiness <= 15
              ? getBestStoredProfileRecovery(
                  userId,
                  Math.max(currentReadiness, syncedReadiness),
                  getReadinessScore
                )
              : null

          if (recovered) {
            const nextState = {
              ...current,
              profile: recovered.state.profile,
              reusableAnswers: {
                ...current.reusableAnswers,
                ...recovered.state.reusableAnswers
              }
            }
            profileLoadMessage = `Recovered a ${recovered.readiness}% profile saved in this browser. Review it, then sync it to this account.`
            saveState(nextState, userId)
            return nextState
          }

          if (syncedReadiness < currentReadiness) {
            profileLoadMessage = `Kept your ${currentReadiness}% local profile because the synced account profile is only ${syncedReadiness}%.`
            return current
          }

          const nextState = {
            ...current,
            profile: syncedProfile
          }
          saveState(nextState, userId)
          return nextState
        })

        if (profileLoadMessage) {
          setStatus(profileLoadMessage)
        } else if (!silent) {
          setStatus(successMessage)
        }
        return true
      } catch (error: unknown) {
        console.error("Dashboard action failed: load profile fetch", error)
        if (!silent) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not load synced profile"
          )
        }
        reportClientDiagnostic(
          "sync.profile.client.read-fetch-failed",
          error instanceof Error
            ? error.message
            : "Profile sync read fetch failed",
          {
            operation: "profile-read",
            route: "/api/sync/profile"
          }
        )
        return false
      }
    },
    [cloudSyncReadiness, userId]
  )

  useEffect(() => {
    const storedState = getStoredState(userId)
    const storedReadiness = getReadinessScore(storedState)
    const recovered =
      storedReadiness <= 15
        ? getBestStoredProfileRecovery(userId, storedReadiness, getReadinessScore)
        : null
    const initialState = recovered
      ? {
          ...storedState,
          profile: recovered.state.profile,
          reusableAnswers: {
            ...storedState.reusableAnswers,
            ...recovered.state.reusableAnswers
          }
        }
      : storedState

    const mobilityPrefill =
      currentTab === "profile"
        ? computeMobilityCountryPrefill(initialState.profile, userId)
        : null
    const prefilledState = mobilityPrefill
      ? {
          ...initialState,
          profile: { ...initialState.profile, ...mobilityPrefill.patch }
        }
      : initialState

    setState(prefilledState)
    setMobilityPrefillNote(
      mobilityPrefill?.applied ?? {
        currentCountry: false,
        targetCountries: false
      }
    )
    if (recovered) {
      saveState(prefilledState, userId)
      setStatus(
        `Recovered a ${recovered.readiness}% profile saved in this browser. Review it, then sync it to this account.`
      )
    }
    setProductContext(getStoredProductContext(userId))
    setTrustState(getStoredTrustState(userId))
    setShowFirstRunWalkthrough(
      window.localStorage.getItem(
        getUserScopedStorageKey(walkthroughStorageKey, userId)
      ) !== "true"
    )
    const storedSyncPreferences = getStoredSyncPreferences(userId)
    const productionSyncPreferences = cloudSyncReadiness.configured
      ? {
          ...storedSyncPreferences,
          profileAccountSyncEnabled: true
        }
      : storedSyncPreferences

    setSyncPreferences(productionSyncPreferences)
    setCloudSyncConsent(productionSyncPreferences.profileAccountSyncEnabled)
    if (
      productionSyncPreferences.profileAccountSyncEnabled !==
      storedSyncPreferences.profileAccountSyncEnabled
    ) {
      saveSyncPreferences(productionSyncPreferences, userId)
    }
    if (
      !recovered &&
      storedReadiness <= 15 &&
      cloudSyncReadiness.configured
    ) {
      void loadProfileSnapshot({
        silent: true,
        successMessage: "Synced profile restored into this browser"
      })
    }
    if (cloudSyncReadiness.configured) {
      void getCloudSyncSessionState(createBrowserCloudSyncClient()).then(
        setCloudSyncSessionState
      )
      void loadDashboardSnapshot({ force: true, silent: true })
      void loadProfileSnapshot({ silent: true })
    }
    // `currentTab` is deliberately excluded: this effect initializes
    // dashboard state from storage once per user session (it also derives
    // and sets several other pieces of state from storage/recovery).
    // Including it would re-run this whole initialization - and
    // setState(prefilledState) - every time the user switches tabs,
    // clobbering any in-progress unsaved edits on every tab switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSyncReadiness.configured, loadDashboardSnapshot, loadProfileSnapshot, userId])

  useEffect(() => {
    if (!cloudSyncReadiness.configured) {
      return
    }

    const refreshSyncedWorkflow = () => {
      // This runs on a recurring 3s interval plus focus/visibility events
      // throughout an active session, not just once at mount - force: true
      // here would bypass hasUnsyncedDashboardChangesRef and let a poll that
      // lands mid-debounce (or while a write is still in flight) overwrite
      // an edit the user just made with the older server snapshot.
      void loadDashboardSnapshot({ silent: true })
      void loadProfileSnapshot({ silent: true })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSyncedWorkflow()
      }
    }

    window.addEventListener("focus", refreshSyncedWorkflow)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshSyncedWorkflow()
      }
    }, 3000)

    return () => {
      window.removeEventListener("focus", refreshSyncedWorkflow)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.clearInterval(intervalId)
    }
  }, [
    cloudSyncReadiness.configured,
    loadDashboardSnapshot,
    loadProfileSnapshot,
    syncPreferences.profileAccountSyncEnabled
  ])

  const persist = (next: CompanionDashboardState, message: string) => {
    setState(next)
    saveState(next, userId)
    setStatus(message)
    setTimeout(() => setStatus(""), 3000)
  }

  const reportClientDiagnostic = (
    code: string,
    message: string,
    metadata: Record<string, string | number | boolean | null> = {}
  ) => {
    void fetch("/api/diagnostics/client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-autotime-source": "web"
      },
      body: JSON.stringify({
        area: "sync",
        code,
        message,
        metadata
      })
    }).catch((error: unknown) => {
      console.error("Dashboard diagnostic logging failed:", error)
    })
  }

  const logDashboardActionFailure = (
    action: string,
    error: unknown,
    metadata: Record<string, string | number | boolean | null> = {}
  ) => {
    console.error(`Dashboard action failed: ${action}`, {
      error,
      metadata
    })
  }

  const runOnlineAnalytics = async () => {
    if (!requireCapability("view_insights")) {
      return
    }

    if (!persistedEvidenceRecords.length && !persistedOutcomeRecords.length) {
      setOnlineAnalyticsStatus("Save a checked job before running analytics.")
      return
    }

    setOnlineAnalyticsStatus("Preparing evidence report from tracked jobs...")
    try {
      const response = await fetch("/api/analytics/evidence-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceRecords: persistedEvidenceRecords,
          outcomeRecords: persistedOutcomeRecords
        })
      })

      if (!response.ok) {
        throw new Error(`service returned ${response.status}`)
      }

      const report = (await response.json()) as OnlineAnalyticsReport
      setOnlineAnalyticsReport(report)
      setOnlineAnalyticsStatus(
        "Evidence report updated from tracked jobs and outcomes."
      )
    } catch (error) {
      logDashboardActionFailure("run online analytics", error)
      setOnlineAnalyticsReport(null)
      setOnlineAnalyticsStatus(
        error instanceof Error
          ? `Evidence report unavailable: ${error.message}`
          : "Evidence report unavailable."
      )
    }
  }

  const syncProfileStateToCloud = async (
    profile: CandidateProfile,
    {
      failureMessage = "Profile saved locally. Sync failed",
      silent = false,
      successMessage = "Profile synced to your dashboard account"
    }: {
      failureMessage?: string
      silent?: boolean
      successMessage?: string
    } = {}
  ) => {
    if (!cloudSyncReadiness.configured) {
      if (!silent) {
        setStatus(
          `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
        )
      }
      return false
    }

    const action = prepareProfileSyncAction({
      readiness: cloudSyncReadiness,
      session: {
        checked: true,
        authenticated: true,
        userEmail: "signed-in-account",
        provider: null,
        message: "Dashboard session will be checked by the sync endpoint."
      },
      profile,
      explicitUserAction: true,
      consentGranted: true
    })

    if (!action.ready) {
      if (!silent) {
        setStatus(action.message)
      }
      return false
    }

    try {
      const response = await fetch("/api/sync/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-autotime-source": "web"
        },
        body: JSON.stringify(profile)
      })
      const body = (await response.json()) as {
        error: string | null
      }

      if (!response.ok || body.error) {
        logDashboardActionFailure(
          "sync profile response",
          body.error ?? "Profile sync failed",
          {
            httpStatus: response.status,
            route: "/api/sync/profile"
          }
        )
        if (!silent) {
          setStatus(`${failureMessage}: ${body.error ?? "Profile sync failed"}`)
        }
        reportClientDiagnostic(
          "sync.profile.client.response-failed",
          body.error ?? "Profile sync response failed",
          {
            httpStatus: response.status,
            operation: "profile-write",
            route: "/api/sync/profile"
          }
        )
        return false
      }

      if (!silent) {
        setStatus(successMessage)
      }
      return true
    } catch (error: unknown) {
      logDashboardActionFailure("sync profile fetch", error, {
        route: "/api/sync/profile"
      })
      if (!silent) {
        setStatus(
          `${failureMessage}: ${
            error instanceof Error ? error.message : "Profile sync failed"
          }`
        )
      }
      reportClientDiagnostic(
        "sync.profile.client.fetch-failed",
        error instanceof Error ? error.message : "Profile sync fetch failed",
        {
          operation: "profile-write",
          route: "/api/sync/profile"
        }
      )
      return false
    }
  }

  const scheduleProfileSync = (profile: CandidateProfile) => {
    if (
      !syncPreferences.profileAccountSyncEnabled ||
      !cloudSyncReadiness.configured
    ) {
      return
    }

    hasUnsyncedProfileChangesRef.current = true

    if (profileSyncTimeoutRef.current) {
      clearTimeout(profileSyncTimeoutRef.current)
    }

    profileSyncTimeoutRef.current = setTimeout(() => {
      profileSyncTimeoutRef.current = null
      void syncProfileStateToCloud(profile, {
        failureMessage: "Profile saved locally. Dashboard sync failed",
        successMessage: "Profile saved and synced to dashboard"
      }).then((synced) => {
        hasUnsyncedProfileChangesRef.current = !synced
      })
    }, 1200)
  }

  const updateProfile = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    const nextState = {
      ...state,
      profile: { ...state.profile, [key]: value }
    }

    setState(nextState)
    saveState(nextState, userId)
    scheduleProfileSync(nextState.profile)
    if (key === "currentCountry" || key === "targetCountries") {
      setMobilityPrefillNote((current) => ({ ...current, [key]: false }))
    }
  }

  const setProfileAccountSyncEnabled = (enabled: boolean) => {
    const next = {
      ...syncPreferences,
      profileAccountSyncEnabled: enabled
    }

    setSyncPreferences(next)
    setCloudSyncConsent(enabled)
    saveSyncPreferences(next, userId)
  }

  const updateJob = <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => {
    setState((current) => {
      const next = {
        ...current,
        jobAnalysis: { ...current.jobAnalysis, [key]: value }
      }
      saveState(next, userId)
      return next
    })
  }

  const loadTrackedJobForCheck = (applicationId: string) => {
    const application = state.applications.find(
      (item) => item.id === applicationId
    )

    if (!application) {
      setStatus("Tracked job was not found")
      return
    }

    const next = {
      ...state,
      jobAnalysis: createJobAnalysisFromApplication(application)
    }

    setState(next)
    saveState(next, userId)
    setStatus("Parsed job details loaded from tracked job")
    setTimeout(() => setStatus(""), 3000)
  }

  const updateReusableAnswer = <K extends keyof ReusableAnswers>(
    key: K,
    value: ReusableAnswers[K]
  ) => {
    let nextState: CompanionDashboardState | null = null

    setState((current) => {
      const next = {
        ...current,
        reusableAnswers: { ...current.reusableAnswers, [key]: value }
      }
      saveState(next, userId)
      nextState = next
      return next
    })

    if (nextState) {
      scheduleDashboardSync(nextState, {
        failureMessage: "Answer saved locally. Dashboard sync failed",
        successMessage: "Answer saved and synced to dashboard"
      })
    }
  }

  const setOfficialSourceReviewed = (reviewed: boolean) => {
    const next = {
      officialSourceReviewed: reviewed,
      officialSourceReviewedAt: reviewed ? new Date().toISOString() : ""
    }
    setTrustState(next)
    saveTrustState(next, userId)
  }

  const openDashboardView = (nextView: DashboardTab | "overview") => {
    const nextRoute =
      nextView === "overview" ? "/dashboard" : `/dashboard/${nextView}`

    window.location.assign(nextRoute)
  }

  const updateProductContext = <K extends keyof ProductContext>(
    key: K,
    value: ProductContext[K]
  ) => {
    if (
      contextSuggestion &&
      key in contextSuggestion &&
      contextSuggestion[key as keyof ContextSuggestion] !== value
    ) {
      trackFactCorrection({
        field: String(key),
        suggestionSource: contextSuggestionSource ?? "unknown"
      })
    }

    setProductContext((current) => {
      const next = { ...current, [key]: value }
      saveProductContext(next, userId)
      return next
    })
  }

  const applyMarketContextToProfile = () => {
    const missingFields = getMissingProductContextFields(productContext)

    if (missingFields.length > 0) {
      const statusMessage = `Choose ${missingFields.join(
        ", "
      )} before applying settings to My Profile.`
      setStatus(statusMessage)
      setTimeout(() => setStatus(""), 4000)
      window.alert(statusMessage)
      return
    }

    const confirmedContext = productContext as ResolvedProductContext
    const market = getRoleMarket(confirmedContext)
    const profileSettingsNote = `Profile settings: ${getMarketLabel(confirmedContext)} / ${
      confirmedContext.candidatePosition === "foreign-candidate"
        ? "foreign or relocating"
        : "native or local"
    } / ${confirmedContext.targetCountry} / ${confirmedContext.urgency}.`
    const currentJobNotes = state.jobAnalysis.notes.trim()
    const nextJobNotes = currentJobNotes.includes(profileSettingsNote)
      ? currentJobNotes
      : [currentJobNotes, profileSettingsNote].filter(Boolean).join("\n")
    const nextState = {
      ...state,
      profile: {
        ...state.profile,
        targetCountries: confirmedContext.targetCountry,
        targetRoles: market.targetRoles,
        relocationWillingness:
          confirmedContext.candidatePosition === "foreign-candidate"
            ? "depends"
            : state.profile.relocationWillingness
      },
      jobAnalysis: {
        ...state.jobAnalysis,
        seniority: confirmedContext.experienceLevel,
        positioningAngle: getMarketPositioning(confirmedContext),
        notes: nextJobNotes
      }
    }
    const statusMessage = state.profile.workRightDetails.trim()
      ? "Profile settings applied to saved evidence"
      : "Profile settings applied. Add verified work-right details next."

    persist(nextState, statusMessage)
    scheduleProfileSync(nextState.profile)
    window.alert(statusMessage)
  }

  const reviewResumeForContext = async () => {
    if (!resumeIntake.trim()) {
      setStatus("Paste CV or resume text before reviewing candidate context")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    if (!canReviewResumeWithAi) {
      setStatus("Add at least 40 characters of CV text before reviewing.")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    setIsReviewingCv(true)
    setContextSuggestionNote("")
    setStatus("Reviewing your CV for profile suggestions...")

    try {
      const localSuggestion = inferContextFromResume(resumeIntake, productContext)
      const response = await fetch("/api/ai/profile-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentContext: productContext,
          resumeText: resumeIntake
        })
      })
      const body = (await response.json()) as ProfileContextReviewResponse

      if (body.data && "upgradeUrl" in body.data) {
        const message =
          "Review limit reached. Local suggestions prepared instead."
        setContextSuggestion(localSuggestion)
        setContextSuggestionSource("limit")
        setContextSuggestionNote(message)
        setStatus("Review limit reached. Local suggestions prepared for approval.")
        window.alert(`${message} Review them before applying to My Profile.`)
        return
      }

      if (!response.ok || !body.data || body.error) {
        logDashboardActionFailure(
          "review resume context response",
          body.error ?? "CV review unavailable",
          {
            httpStatus: response.status,
            route: "/api/ai/profile-context"
          }
        )
        const message = body.error
          ? `CV review unavailable: ${body.error}`
          : "CV review unavailable. Local suggestions prepared."
        setContextSuggestion(localSuggestion)
        setContextSuggestionSource("error")
        setContextSuggestionNote(message)
        setStatus(`${message} Local suggestions prepared.`)
        window.alert(`${message} Review the local suggestions before applying.`)
        return
      }

      setContextSuggestion(
        normalizeContextSuggestionForApproval({
          fallback: localSuggestion,
          suggestion: body.data.suggestion
        })
      )
      setContextSuggestionSource("ai")
      setContextSuggestionNote("")
      setStatus("CV review complete. Approve suggestions before saving.")
    } catch (error: unknown) {
      logDashboardActionFailure("review resume context fetch", error, {
        route: "/api/ai/profile-context"
      })
      const message =
        error instanceof Error
          ? `CV review unavailable: ${error.message}`
          : "CV review unavailable. Local suggestions prepared."
      setContextSuggestion(inferContextFromResume(resumeIntake, productContext))
      setContextSuggestionSource("local")
      setContextSuggestionNote(message)
      setStatus(`${message} Local suggestions prepared.`)
      window.alert(`${message} Review the local suggestions before applying.`)
    } finally {
      setIsReviewingCv(false)
      setTimeout(() => setStatus(""), 5000)
    }
  }

  const importResumeFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith(".doc")) {
      setStatus(
        "Old .doc files are not supported. Save the CV as .docx or copy the text here."
      )
      event.target.value = ""
      return
    }

    if (fileName.endsWith(".docx")) {
      try {
        const formData = new FormData()
        formData.set("file", file)

        const response = await fetch("/api/profile/import-cv", {
          method: "POST",
          body: formData
        })
        const body = (await response.json()) as {
          data: { text: string } | null
          error: string | null
        }

        if (!response.ok || !body.data?.text) {
          logDashboardActionFailure(
            "import Word CV response",
            body.error ?? "Could not import this Word CV file.",
            {
              httpStatus: response.status,
              route: "/api/profile/import-cv"
            }
          )
          setStatus(body.error ?? "Could not import this Word CV file.")
          return
        }

        setResumeIntake(body.data.text)
        setContextSuggestion(null)
        setContextSuggestionSource(null)
        setContextSuggestionNote("")
        setStatus(`Imported ${file.name}. Review before applying suggestions.`)
        setTimeout(() => setStatus(""), 3000)
      } catch (error: unknown) {
        logDashboardActionFailure("import Word CV fetch", error, {
          route: "/api/profile/import-cv"
        })
        setStatus(
          error instanceof Error
            ? `Could not import this Word CV file: ${error.message}`
            : "Could not import this Word CV file."
        )
      } finally {
        event.target.value = ""
      }

      return
    }

    const supportedExtensions = [
      ".txt",
      ".md",
      ".markdown",
      ".csv",
      ".json",
      ".rtf"
    ]
    const isSupported =
      file.type.startsWith("text/") ||
      supportedExtensions.some((extension) => fileName.endsWith(extension))

    if (!isSupported) {
      setStatus(
        "CV import supports DOCX and text files. For PDF or old DOC files, copy the text and paste it here."
      )
      event.target.value = ""
      return
    }

    try {
      const text = await file.text()
      setResumeIntake(text)
      setContextSuggestion(null)
      setContextSuggestionSource(null)
      setContextSuggestionNote("")
      setStatus(`Imported ${file.name}. Review before applying suggestions.`)
      setTimeout(() => setStatus(""), 3000)
    } catch (error: unknown) {
      logDashboardActionFailure("import text CV", error, {
        fileName: file.name
      })
      setStatus("Could not import this CV file. Copy the text and paste it here.")
    } finally {
      event.target.value = ""
    }
  }

  const approveContextSuggestion = () => {
    if (!contextSuggestion) {
      window.alert("Review your CV first, then apply the approved suggestions.")
      return
    }

    const cvEvidenceSource = resumeIntake.trim() || state.profile.baseCvText

    if (!cvEvidenceSource.trim()) {
      window.alert("Add or import your CV first, then review and approve it.")
      return
    }

    saveProductContext(
      {
        roleMarket: contextSuggestion.roleMarket,
        candidatePosition: contextSuggestion.candidatePosition,
        urgency: contextSuggestion.urgency,
        targetCountry: contextSuggestion.targetCountry,
        experienceLevel: contextSuggestion.experienceLevel
      },
      userId
    )
    setProductContext(contextSuggestion)
    const inferredEvidence = inferEvidenceFromResume(cvEvidenceSource)
    const inferredDetails = inferCandidateDetailsFromResume(cvEvidenceSource)
    const currentProfile = state.profile
    const canUseInferredCurrentCountry =
      !currentProfile.currentCountry.trim() ||
      (currentProfile.currentCountry === emptyProfile.currentCountry &&
        !currentProfile.currentCity.trim())
    const nextProfile: CandidateProfile = {
      ...currentProfile,
      baseCvText: cvEvidenceSource,
      fullName: currentProfile.fullName.trim()
        ? currentProfile.fullName
        : inferredDetails.fullName,
      email: currentProfile.email.trim() ? currentProfile.email : inferredDetails.email,
      phone: currentProfile.phone.trim() ? currentProfile.phone : inferredDetails.phone,
      linkedInUrl: currentProfile.linkedInUrl.trim()
        ? currentProfile.linkedInUrl
        : inferredDetails.linkedInUrl,
      githubUrl: currentProfile.githubUrl.trim()
        ? currentProfile.githubUrl
        : inferredDetails.githubUrl,
      portfolioUrl: currentProfile.portfolioUrl.trim()
        ? currentProfile.portfolioUrl
        : inferredDetails.portfolioUrl,
      currentCountry: currentProfile.currentCountry.trim()
        ? canUseInferredCurrentCountry
          ? inferredDetails.currentCountry || currentProfile.currentCountry
          : currentProfile.currentCountry
        : inferredDetails.currentCountry,
      currentCity: currentProfile.currentCity.trim()
        ? currentProfile.currentCity
        : inferredDetails.currentCity,
      targetCountries: contextSuggestion.targetCountry,
      targetRoles: contextSuggestion.targetRoles || currentProfile.targetRoles,
      workRightDetails:
        currentProfile.workRightDetails.trim() || contextSuggestion.workRightPrompt,
      experienceHighlights: currentProfile.experienceHighlights.trim()
        ? currentProfile.experienceHighlights
        : inferredEvidence.experienceHighlights,
      projectSummaries: currentProfile.projectSummaries.trim()
        ? currentProfile.projectSummaries
        : inferredEvidence.projectSummaries
    }
    const filledEvidenceFields = [
      cvEvidenceSource !== currentProfile.baseCvText && "CV text",
      !currentProfile.fullName.trim() && inferredDetails.fullName && "full name",
      !currentProfile.email.trim() && inferredDetails.email && "email",
      !currentProfile.phone.trim() && inferredDetails.phone && "phone",
      !currentProfile.linkedInUrl.trim() &&
        inferredDetails.linkedInUrl &&
        "LinkedIn URL",
      !currentProfile.githubUrl.trim() &&
        inferredDetails.githubUrl &&
        "GitHub URL",
      !currentProfile.portfolioUrl.trim() &&
        inferredDetails.portfolioUrl &&
        "portfolio URL",
      !currentProfile.currentCountry.trim() &&
        inferredDetails.currentCountry &&
        "current country",
      canUseInferredCurrentCountry &&
        inferredDetails.currentCountry &&
        inferredDetails.currentCountry !== currentProfile.currentCountry &&
        "current country",
      !currentProfile.currentCity.trim() &&
        inferredDetails.currentCity &&
        "current city",
      currentProfile.targetCountries !== nextProfile.targetCountries &&
        "target country",
      currentProfile.targetRoles !== nextProfile.targetRoles && "target roles",
      !currentProfile.workRightDetails.trim() &&
        nextProfile.workRightDetails &&
        "work-right details",
      !currentProfile.experienceHighlights.trim() &&
        inferredEvidence.experienceHighlights &&
        "experience highlights",
      !currentProfile.projectSummaries.trim() &&
        inferredEvidence.projectSummaries &&
        "project examples"
    ].filter(Boolean)
    const nextState = {
      ...state,
      profile: nextProfile,
      jobAnalysis: {
        ...state.jobAnalysis,
        seniority: contextSuggestion.experienceLevel,
        positioningAngle: getMarketPositioning(contextSuggestion)
      }
    }

    persist(nextState, "Approved CV context applied")
    scheduleProfileSync(nextState.profile)
    setContextSuggestion(null)
    setContextSuggestionSource(null)
    setContextSuggestionNote("")
    window.alert(
      filledEvidenceFields.length
        ? `Approved CV suggestions applied to My Profile. AutoTime also filled ${filledEvidenceFields.join(
            " and "
          )} from your CV. Review the saved fields before using job checks.`
        : "Approved CV suggestions applied to My Profile. Review the saved fields before using job checks."
    )
  }

  const saveDashboard = () => {
    persist(
      state,
      cloudSyncReadiness.configured
        ? "Dashboard saved. Syncing to your account..."
        : "Dashboard saved in this browser"
    )

    if (cloudSyncReadiness.configured) {
      void syncProfileStateToCloud(state.profile, {
        failureMessage: "Profile saved in browser cache. Account sync failed",
        silent: true,
        successMessage: "Profile saved to account"
      })
      scheduleDashboardSync(state, {
        failureMessage: "Dashboard saved in browser cache. Account sync failed",
        successMessage: "Dashboard saved to account"
      })
    }
  }

  const syncDashboardStateToCloud = async (
    nextState: CompanionDashboardState,
    {
      failureMessage = "Dashboard saved locally. Sync failed",
      silent = false,
      successMessage = "Dashboard workflow synced to your account"
    }: {
      failureMessage?: string
      silent?: boolean
      successMessage?: string
    } = {}
  ) => {
    if (!cloudSyncReadiness.configured) {
      if (!silent) {
        setStatus(
          `Dashboard saved locally. Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
        )
      }
      return false
    }

    try {
      const response = await fetch("/api/sync/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-autotime-source": "web"
        },
        body: JSON.stringify({
          reusableAnswers: nextState.reusableAnswers,
          applications: nextState.applications,
          evidenceRecords: nextState.evidenceRecords ?? [],
          outcomeRecords: nextState.outcomeRecords ?? [],
          interviewPrepPacks: nextState.interviewPrepPacks
        })
      })
      const body = (await response.json()) as {
        error: string | null
      }

      if (!response.ok || body.error) {
        logDashboardActionFailure(
          "sync dashboard response",
          body.error ?? "Dashboard sync failed",
          {
            applicationCount: nextState.applications.length,
            httpStatus: response.status,
            route: "/api/sync/dashboard"
          }
        )
        if (!silent) {
          setStatus(
            `${failureMessage}: ${body.error ?? "Dashboard sync failed"}`
          )
        }
        reportClientDiagnostic(
          "sync.dashboard.client.response-failed",
          body.error ?? "Dashboard sync response failed",
          {
            applicationCount: nextState.applications.length,
            httpStatus: response.status,
            operation: "dashboard-write",
            route: "/api/sync/dashboard"
          }
        )
        return false
      }

      if (!silent) {
        setStatus(successMessage)
      }
      return true
    } catch (error: unknown) {
      logDashboardActionFailure("sync dashboard fetch", error, {
        applicationCount: nextState.applications.length,
        route: "/api/sync/dashboard"
      })
      if (!silent) {
        setStatus(
          `${failureMessage}: ${
            error instanceof Error ? error.message : "Dashboard sync failed"
          }`
        )
      }
      reportClientDiagnostic(
        "sync.dashboard.client.fetch-failed",
        error instanceof Error ? error.message : "Dashboard sync fetch failed",
        {
          applicationCount: nextState.applications.length,
          operation: "dashboard-write",
          route: "/api/sync/dashboard"
        }
      )
      return false
    }
  }

  const syncDashboardToCloud = async () => {
    setCloudSyncConsent(true)
    hasUnsyncedDashboardChangesRef.current = true
    const synced = await syncDashboardStateToCloud(state)
    hasUnsyncedDashboardChangesRef.current = !synced
  }

  const scheduleDashboardSync = (
    nextState: CompanionDashboardState,
    messages?: {
      failureMessage?: string
      successMessage?: string
    }
  ) => {
    hasUnsyncedDashboardChangesRef.current = true

    if (applicationSyncTimeoutRef.current) {
      clearTimeout(applicationSyncTimeoutRef.current)
    }

    applicationSyncTimeoutRef.current = setTimeout(() => {
      applicationSyncTimeoutRef.current = null
      void syncDashboardStateToCloud(nextState, messages).then((synced) => {
        hasUnsyncedDashboardChangesRef.current = !synced
      })
    }, 900)
  }

  useEffect(() => {
    return () => {
      if (applicationSyncTimeoutRef.current) {
        clearTimeout(applicationSyncTimeoutRef.current)
      }
      if (profileSyncTimeoutRef.current) {
        clearTimeout(profileSyncTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeFocus !== "application-answers") {
      return
    }

    if (!activeKitApplication) {
      setKitApplicationId("")
      setKitDraft(null)
      return
    }

    setKitApplicationId(activeKitApplication.id)
    setKitDraft(
      activeKitApplication.contentSnapshot ??
        createApplicationContentSnapshot({
          application: activeKitApplication,
          job: state.jobAnalysis,
          positioningPack: applicationPositioningPack,
          profile: state.profile,
          reusableAnswers: state.reusableAnswers
        })
    )
  }, [
    activeFocus,
    activeKitApplication,
    applicationPositioningPack,
    state.jobAnalysis,
    state.profile,
    state.reusableAnswers
  ])

  const loadDashboardFromCloud = async () => {
    await loadDashboardSnapshot({
      successMessage: "Synced dashboard workflow loaded"
    })
  }

  const updateKitDraft = (
    key: ApplicationContentField,
    value: string
  ) => {
    setKitDraft((current) =>
      current
        ? {
            ...current,
            [key]: value
          }
        : current
    )
  }

  const regenerateKitDraft = async () => {
    const evidenceUseConfirmed = confirmApplicationEvidenceUse()
    if (
      !evidenceUseConfirmed ||
      !requireCapability("prepare_application", {
        application: { evidenceUseConfirmed }
      })
    ) {
      return
    }

    if (!activeKitApplication) {
      setStatus("Track a job first, then generate application content")
      return
    }

    if (!kitPreparationStartedAtRef.current[activeKitApplication.id]) {
      kitPreparationStartedAtRef.current[activeKitApplication.id] = Date.now()
      trackKitPreparationStarted({ applicationId: activeKitApplication.id })
    }

    const localDraft = createApplicationContentSnapshot({
      application: activeKitApplication,
      job: state.jobAnalysis,
      positioningPack: applicationPositioningPack,
      profile: state.profile,
      reusableAnswers: state.reusableAnswers
    })

    setIsCopilotThinking(true)
    setStatus("Generating application kit with AutoTime AI...")

    try {
      const response = await fetch("/api/ai/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: state.jobAnalysis,
          profile: state.profile,
          reusableAnswers: state.reusableAnswers,
          context: {
            candidatePosition: resolvedProductContext.candidatePosition,
            targetCountry: resolvedProductContext.targetCountry
          }
        })
      })
      const body = (await response.json()) as {
        data: {
          content?: ApplicationContentDraft
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || !body.data?.content) {
        logDashboardActionFailure(
          "generate application kit response",
          body.error ?? "Application Kit AI content unavailable",
          {
            applicationId: activeKitApplication.id,
            httpStatus: response.status,
            route: "/api/ai/content"
          }
        )
        setKitDraft(localDraft)
        setStatus(
          body.data?.upgradeUrl
            ? `${body.error ?? "Upgrade required"} Local draft generated.`
            : body.error ?? "AI content unavailable. Local draft generated."
        )
        return
      }

      setKitDraft({
        ...localDraft,
        ...body.data.content
      })
      setStatus("Application Kit draft generated with AutoTime AI")
    } catch (error: unknown) {
      logDashboardActionFailure("generate application kit fetch", error, {
        applicationId: activeKitApplication.id,
        route: "/api/ai/content"
      })
      setKitDraft(localDraft)
      setStatus(
        error instanceof Error
          ? `AI content unavailable. Local draft generated: ${error.message}`
          : "AI content unavailable. Local draft generated."
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const saveApplicationKitSnapshot = () => {
    const evidenceUseConfirmed = confirmApplicationEvidenceUse()
    if (
      !evidenceUseConfirmed ||
      !requireCapability("prepare_application", {
        application: {
          evidenceUseConfirmed,
          explicitReview: true,
          generatedAnswerAvailable: Boolean(kitDraft)
        }
      })
    ) {
      return
    }

    if (!activeKitApplication || !kitDraft) {
      setStatus("Track a job first, then save application content")
      return
    }

    const preparationStartedAt =
      kitPreparationStartedAtRef.current[activeKitApplication.id]
    if (preparationStartedAt) {
      trackKitPreparationSaved({
        applicationId: activeKitApplication.id,
        durationMs: Date.now() - preparationStartedAt
      })
      delete kitPreparationStartedAtRef.current[activeKitApplication.id]
    }

    const snapshot = {
      ...kitDraft,
      savedAt: new Date().toISOString()
    }
    const nextState = {
      ...state,
      reusableAnswers: {
        ...state.reusableAnswers,
        availabilityAnswer: snapshot.availabilityAnswer,
        motivationAnswer: snapshot.motivationAnswer,
        strengthsAnswer: snapshot.strengthsAnswer
      },
      applications: state.applications.map((application) =>
        application.id === activeKitApplication.id
          ? {
              ...application,
              contentSnapshot: snapshot,
              updatedAt: snapshot.savedAt
            }
          : application
      )
    }

    setKitApplicationId(activeKitApplication.id)
    setKitDraft(snapshot)
    persist(nextState, "Application Kit saved to job proof and Proof Library")
    scheduleDashboardSync(nextState, {
      failureMessage: "Job proof saved locally. Dashboard sync failed",
      successMessage: "Job proof and Proof Library saved and synced"
    })
  }

  const copyKitField = async (label: string, value: string) => {
    if (!value.trim()) {
      setStatus(`${label} is empty`)
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setStatus(`${label} copied`)
    } catch (error: unknown) {
      logDashboardActionFailure("copy application kit field", error, { label })
      setStatus("Copy failed. Select the text and copy it manually.")
    }
  }

  const saveApplicationFromJob = async () => {
    if (isSavingApplication) {
      return
    }

    if (!requireCapability("analyse_job")) {
      return
    }

    if (!hasJobDraft(state.jobAnalysis)) {
      setStatus(
        "Add a job title, company, URL or job description before saving"
      )
      return
    }

    try {
      setIsSavingApplication(true)

      let jobForTracking = state.jobAnalysis
      let reviewForTracking = autoTimeFitReview
      let evaluationForTracking = fitEvaluation

      if (!state.jobAnalysis.scoreBreakdown?.length) {
        setStatus("Checking the role against your profile before saving...")
        const aiResult = await fetchAiJobAnalysis({
          jobAnalysis: state.jobAnalysis,
          profile: state.profile
        })

        if (aiResult.result) {
          jobForTracking = { ...state.jobAnalysis, ...aiResult.result }
          reviewForTracking = getJobFitReview({
            job: jobForTracking,
            profile: state.profile
          })
          evaluationForTracking = evaluateCountryFit({
            profile: state.profile,
            job: { ...jobForTracking, fitScore: reviewForTracking.fitScore },
            context: {
              candidatePosition: resolvedProductContext.candidatePosition,
              targetCountry: resolvedProductContext.targetCountry,
              outcomeSignals: outcomeLearningSignals
            }
          })
        }
        // If the AI check failed, hit a rate limit, or needs an upgrade,
        // tracking still proceeds with the local heuristic review - same
        // safe fallback the explicit "Check role" button already has,
        // just silent here since saving shouldn't be blocked by it.
      }

      const application = createApplication(
        {
          ...jobForTracking,
          fitScore: evaluationForTracking.overallScore,
          recommendation:
            evaluationForTracking.decision === "Apply now"
              ? "High Priority"
              : evaluationForTracking.decision === "Stretch application"
                ? "Stretch"
                : evaluationForTracking.decision === "Skip for now"
                  ? "Skip"
                  : "Worth Applying",
          positioningAngle: evaluationForTracking.positioningAngle,
          scoreFactors: evaluationForTracking.components.map(
            (item) => `${item.label}: ${item.rationale}`
          )
        },
        evaluationForTracking,
        reviewForTracking
      )

      if (evaluationForTracking.contentGate !== "ready") {
        trackDecisionOverride({
          contentGate: evaluationForTracking.contentGate,
          decision: evaluationForTracking.decision
        })
      }

      const nextState = {
        ...state,
        jobAnalysis:
          jobForTracking === state.jobAnalysis
            ? state.jobAnalysis
            : jobForTracking,
        applications: [application, ...state.applications],
        evidenceRecords: [
          ...createEvidenceRecords({
            application,
            fitEvaluation: evaluationForTracking,
            profile: state.profile
          }),
          ...(state.evidenceRecords ?? [])
        ],
        outcomeRecords: [
          createOutcomeRecord(application),
          ...(state.outcomeRecords ?? [])
        ]
      }

      persist(nextState, "Job tracked with evidence and outcome history")
      hasUnsyncedDashboardChangesRef.current = true
      const synced = await syncDashboardStateToCloud(nextState, {
        failureMessage: "Job tracked locally. Dashboard sync failed",
        successMessage: "Job tracked and synced to dashboard"
      })
      hasUnsyncedDashboardChangesRef.current = !synced
      openDashboardView("applications")
    } catch (error: unknown) {
      logDashboardActionFailure("save tracked job", error)
      setStatus(
        error instanceof Error ? error.message : "Could not track this job"
      )
    } finally {
      setIsSavingApplication(false)
    }
  }

  const fetchAiJobAnalysis = async ({
    jobAnalysis,
    profile
  }: {
    jobAnalysis: JobAnalysisDraft
    profile: CandidateProfile
  }): Promise<{
    result?: Partial<JobAnalysisDraft>
    error?: string
    upgradeUrl?: string
  }> => {
    try {
      const response = await fetch("/api/ai/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ jobAnalysis, profile })
      })
      const body = (await response.json()) as {
        data: {
          result?: Partial<JobAnalysisDraft>
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || body.error || !body.data?.result) {
        logDashboardActionFailure(
          "AI role analysis response",
          body.error ?? "Role analysis failed",
          {
            httpStatus: response.status,
            route: "/api/ai/analyse"
          }
        )
        return {
          error: body.error ?? "Role analysis failed",
          upgradeUrl: body.data?.upgradeUrl
        }
      }

      return { result: body.data.result }
    } catch (error: unknown) {
      logDashboardActionFailure("AI role analysis fetch", error, {
        route: "/api/ai/analyse"
      })
      return {
        error: error instanceof Error ? error.message : "Role analysis failed"
      }
    }
  }

  const runAiJobAnalysis = async () => {
    if (!requireCapability("analyse_job")) {
      return
    }

    if (!hasJobDraft(state.jobAnalysis)) {
      setStatus("Add a job title, company, URL or description before checking the role")
      return
    }

    try {
      setIsCopilotThinking(true)
      setStatus("Checking the role against your profile...")
      const aiResult = await fetchAiJobAnalysis({
        jobAnalysis: state.jobAnalysis,
        profile: state.profile
      })

      if (!aiResult.result) {
        if (aiResult.upgradeUrl) {
          window.location.href = aiResult.upgradeUrl
          return
        }

        setStatus(aiResult.error ?? "Role analysis failed")
        return
      }

      const next = {
        ...state,
        jobAnalysis: {
          ...state.jobAnalysis,
          ...aiResult.result
        }
      }

      persist(next, "AI fit assistant updated the role analysis")
    } catch (error: unknown) {
      logDashboardActionFailure("AI role analysis fetch", error, {
        route: "/api/ai/analyse"
      })
      setStatus(
        error instanceof Error ? error.message : "Role analysis failed"
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const updateApplication = (
    id: string,
    changes: Partial<ApplicationRecord>
  ) => {
    if (
      !requireCapability("manage_tracking", {
        job: { selected: state.applications.some((item) => item.id === id) }
      })
    ) {
      return
    }

    try {
      const updatedAt = new Date().toISOString()
      const updatedApplications = state.applications.map((application) =>
        application.id === id
          ? { ...application, ...changes, updatedAt }
          : application
      )
      const updatedApplication = updatedApplications.find(
        (application) => application.id === id
      )

      if (!updatedApplication) {
        throw new Error("Application was not found in this dashboard")
      }

      const existingOutcome = (state.outcomeRecords ?? []).find(
        (record) => record.applicationId === id
      )
      const updatedOutcome = updateOutcomeRecordFromApplication(
        existingOutcome,
        updatedApplication
      )

      const nextState = {
        ...state,
        applications: updatedApplications,
        outcomeRecords: [
          updatedOutcome,
          ...(state.outcomeRecords ?? []).filter(
            (record) => record.applicationId !== id
          )
        ]
      }

      persist(nextState, "Application and outcome record updated")
      scheduleDashboardSync(nextState, {
        failureMessage: "Application updated locally. Dashboard sync failed",
        successMessage: "Application updated and synced to dashboard"
      })
    } catch (error: unknown) {
      logDashboardActionFailure("update application", error, {
        applicationId: id
      })
      setStatus(
        error instanceof Error ? error.message : "Could not update application"
      )
    }
  }

  const removeApplicationFromState = (
    currentState: CompanionDashboardState,
    id: string
  ): CompanionDashboardState => ({
    ...currentState,
    applications: currentState.applications.filter(
      (application) => application.id !== id
    ),
    evidenceRecords: (currentState.evidenceRecords ?? []).filter(
      (record) => record.applicationId !== id
    ),
    outcomeRecords: (currentState.outcomeRecords ?? []).filter(
      (record) => record.applicationId !== id
    ),
    interviewPrepPacks: currentState.interviewPrepPacks.filter(
      (pack) => pack.applicationId !== id
    )
  })

  const deleteApplication = async (id: string) => {
    if (deletingApplicationIds.includes(id)) {
      return
    }

    if (
      !requireCapability("manage_tracking", {
        job: { selected: state.applications.some((item) => item.id === id) }
      })
    ) {
      return
    }

    const application = state.applications.find((item) => item.id === id)

    if (!application) {
      setStatus("Application was not found in this dashboard")
      logDashboardActionFailure(
        "delete application missing record",
        "Application was not found in this dashboard",
        { applicationId: id }
      )
      return
    }

    const nextState = removeApplicationFromState(state, id)

    try {
      setDeletingApplicationIds((current) => [...current, id])

      if (!cloudSyncReadiness.configured) {
        persist(
          nextState,
          `Application deleted locally. Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
        )
        return
      }

      const response = await fetch("/api/sync/dashboard", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-autotime-source": "web"
        },
        body: JSON.stringify({
          applicationId: application.id,
          url: application.url
        })
      })
      const body = (await response.json()) as {
        error: string | null
      }

      if (!response.ok || body.error) {
        throw new Error(
          body.error ?? "Could not delete application from dashboard"
        )
      }

      persist(nextState, "Application permanently deleted")
    } catch (error: unknown) {
      logDashboardActionFailure("delete application", error, {
        applicationId: application.id,
        route: "/api/sync/dashboard"
      })
      reportClientDiagnostic(
        "sync.dashboard.client.delete-failed",
        error instanceof Error
          ? error.message
          : "Could not delete application from dashboard",
        {
          applicationId: application.id,
          operation: "dashboard-delete",
          route: "/api/sync/dashboard"
        }
      )
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not delete application from dashboard"
      )
    } finally {
      setDeletingApplicationIds((current) =>
        current.filter((applicationId) => applicationId !== id)
      )
    }
  }

  const saveInterviewPrepPack = async (
    pack: CompanionDashboardState["interviewPrepPacks"][number],
    message: string
  ) => {
    if (
      !requireCapability("prepare_interview", {
        job: {
          selected: state.applications.some(
            (item) => item.id === pack.applicationId
          )
        }
      })
    ) {
      return
    }

    const interviewProofStrengths = pack.projectTalkingPoints.length
      ? pack.projectTalkingPoints.join("\n")
      : pack.fitAndGapRecap
    const nextState = {
      ...state,
      reusableAnswers: {
        ...state.reusableAnswers,
        motivationAnswer: pack.positioningStatement || pack.roleSummary,
        strengthsAnswer: interviewProofStrengths
      },
      interviewPrepPacks: [
        pack,
        ...state.interviewPrepPacks.filter(
          (current) => current.applicationId !== pack.applicationId
        )
      ]
    }

    persist(nextState, `${message}; Proof Library updated`)
    hasUnsyncedDashboardChangesRef.current = true
    const synced = await syncDashboardStateToCloud(nextState, {
      failureMessage: "Interview prep saved locally. Proof Library sync failed",
      successMessage: "Interview prep and Proof Library synced to dashboard"
    })
    hasUnsyncedDashboardChangesRef.current = !synced
    openDashboardView("interview")
  }

  const generateInterviewPrep = async (application: ApplicationRecord) => {
    if (
      !requireCapability("prepare_interview", {
        job: {
          selected: state.applications.some(
            (item) => item.id === application.id
          )
        }
      })
    ) {
      return
    }

    const guardrails = getInterviewPrepGuardrails({
      application,
      profile: state.profile,
      job: state.jobAnalysis
    })

    if (!guardrails.ready) {
      setStatus(`Interview prep blocked: ${guardrails.blockers.join(" ")}`)
      return
    }

    const localPack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )

    setIsCopilotThinking(true)
    setStatus("Preparing an interview pack...")

    try {
      const response = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application,
          job: state.jobAnalysis,
          profile: state.profile,
          reusableAnswers: state.reusableAnswers
        })
      })
      const body = (await response.json()) as {
        data: {
          pack?: CompanionDashboardState["interviewPrepPacks"][number]
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || !body.data?.pack) {
        logDashboardActionFailure(
          "generate interview prep response",
          body.error ?? "Interview prep unavailable",
          {
            applicationId: application.id,
            httpStatus: response.status,
            route: "/api/ai/interview"
          }
        )
        if (body.data?.upgradeUrl) {
          setStatus(
            `${body.error ?? "Upgrade required"} Local prep pack saved.`
          )
        } else {
          setStatus(body.error ?? "Interview prep unavailable. Local prep pack saved.")
        }
        await saveInterviewPrepPack(
          localPack,
          "Local interview prep pack generated"
        )
        return
      }

      await saveInterviewPrepPack(
        body.data.pack,
        "Interview prep pack generated and saved"
      )
    } catch (error: unknown) {
      logDashboardActionFailure("generate interview prep fetch", error, {
        applicationId: application.id,
        route: "/api/ai/interview"
      })
      setStatus(
        error instanceof Error
          ? `Interview prep unavailable. Local prep pack saved: ${error.message}`
          : "Interview prep unavailable. Local prep pack saved."
      )
      await saveInterviewPrepPack(
        localPack,
        "Local interview prep pack generated"
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const exportDashboard = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-v2-dashboard.json"
    link.click()
    URL.revokeObjectURL(url)
    setStatus("AutoTime data exported")
  }

  const exportDecisionAudit = () => {
    const audit = {
      productPrinciple:
        "Evidence first. Scores and next steps stay explainable.",
      exportedAt: new Date().toISOString(),
      targetContext: productContext,
      trustState,
      role: {
        title: state.jobAnalysis.jobTitle,
        company: state.jobAnalysis.company,
        url: state.jobAnalysis.jobUrl,
        location: state.jobAnalysis.location,
        workMode: state.jobAnalysis.workMode
      },
      decision: {
        index: decisionBrief.score,
        label: decisionBrief.decision,
        ruleConfidence: decisionBrief.confidence,
        contentGate: decisionBrief.contentGate,
        notProbability: true
      },
      rationale: decisionBrief.rationale,
      evidenceFound: decisionBrief.evidenceFound,
      risksToVerify: decisionBrief.risks,
      missingInputs: decisionBrief.missingInputs,
      nextSteps: decisionBrief.nextActions,
      evidenceLedger: evidenceLedgerRows,
      verificationChecklist,
      officialSources,
      limits: [
        "This report is generated from user-saved profile and job text.",
        "This report is not an official employer, immigration, sponsorship or legal decision.",
        "Official sources and employer requirements should be checked before relying on the recommendation."
      ]
    }
    const blob = new Blob([JSON.stringify(audit, null, 2)], {
      type: "application/json;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-decision-audit.json"
    link.click()
    URL.revokeObjectURL(url)
    setStatus("Decision audit exported")
  }

  const importDashboard = (value: string) => {
    if (!value.trim()) {
      setStatus("Paste exported AutoTime data before restoring")
      return
    }

    try {
      const parsed = JSON.parse(value)
      const result = companionDashboardStateSchema.safeParse(parsed)

      if (!result.success) {
        setStatus("Restore failed: this does not match AutoTime data")
        return
      }

      persist(result.data, "AutoTime data restored")
      scheduleDashboardSync(result.data, {
        failureMessage: "Data restored locally. Account sync failed",
        successMessage: "Data restored and synced"
      })
      scheduleProfileSync(result.data.profile)
      setImportJson("")
    } catch (error: unknown) {
      logDashboardActionFailure("restore dashboard data", error)
      setStatus("Restore failed: exported data could not be read")
    }
  }

  const checkCloudSyncStatus = async () => {
    if (!cloudSyncReadiness.configured) {
      setStatus(
        `Account sync is not ready: ${cloudSyncReadiness.issues.join(", ")}. Your profile remains saved in this browser.`
      )
      return
    }

    try {
      const session = await getCloudSyncSessionState(
        createBrowserCloudSyncClient()
      )

      setStatus(
        session.authenticated
          ? "Account sync is ready. Profile saves as one current online record for this signed-in account."
          : "Account sync is configured, but no signed-in session was found. Sign in before syncing profile or workflow."
      )
    } catch (error: unknown) {
      logDashboardActionFailure("check cloud sync status", error)
      setStatus(
        error instanceof Error
          ? `Could not check account sync: ${error.message}`
          : "Could not check account sync"
      )
    }
  }

  const syncProfileToCloud = async () => {
    setCloudSyncConsent(true)
    const synced = await syncProfileStateToCloud(state.profile)

    if (synced) {
      setProfileAccountSyncEnabled(true)
    }
  }

  const loadProfileFromCloud = async () => {
    await loadProfileSnapshot()
  }

  const resetProfile = async () => {
    if (
      !window.confirm(
        "Reset your profile? This clears your personal details, work rights, target roles, CV text and reusable answers so you can fill it in from scratch. Applications, interviews and saved jobs are not affected."
      )
    ) {
      return
    }

    if (profileSyncTimeoutRef.current) {
      clearTimeout(profileSyncTimeoutRef.current)
      profileSyncTimeoutRef.current = null
    }

    const nextState = {
      ...state,
      profile: emptyProfile,
      reusableAnswers: emptyReusableAnswers
    }
    setState(nextState)
    saveState(nextState, userId)
    setProductContext(defaultProductContext)
    saveProductContext(defaultProductContext, userId)
    setContextSuggestion(null)
    setContextSuggestionSource(null)
    setContextSuggestionNote("")

    if (cloudSyncReadiness.configured) {
      try {
        const response = await fetch("/api/sync/profile", {
          method: "DELETE",
          headers: {
            "x-autotime-source": "web"
          }
        })
        const body = (await response.json()) as {
          error: string | null
        }

        if (!response.ok || body.error) {
          logDashboardActionFailure(
            "reset profile sync delete response",
            body.error ?? "Could not clear the synced profile",
            {
              httpStatus: response.status,
              route: "/api/sync/profile"
            }
          )
          setStatus(
            "Profile reset on this device. Could not clear the saved copy on your account - try again from Settings."
          )
          return
        }
      } catch (error: unknown) {
        logDashboardActionFailure("reset profile sync delete fetch", error, {
          route: "/api/sync/profile"
        })
        setStatus(
          "Profile reset on this device. Could not clear the saved copy on your account - try again from Settings."
        )
        return
      }
    }

    window.localStorage.removeItem(
      `autotime-v2-onboarding-complete:${userId}`
    )
    window.localStorage.removeItem(`autotime-cv-data:${userId}`)
    window.localStorage.removeItem(
      `autotime-progressive-onboarding:v1:${userId}`
    )
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith(`autotime-cv-tailored:${userId}:`)) {
        window.sessionStorage.removeItem(key)
      }
    }
    window.location.assign("/dashboard/onboarding")
  }

  const deleteProfileForAccount = async () => {
    if (!window.confirm("Delete the synced profile for this account?")) {
      return
    }

    try {
      const response = await fetch("/api/sync/profile", {
        method: "DELETE",
        headers: {
          "x-autotime-source": "web"
        }
      })
      const body = (await response.json()) as {
        error: string | null
      }

      if (!response.ok || body.error) {
        logDashboardActionFailure(
          "delete synced profile response",
          body.error ?? "Could not delete synced profile",
          {
            httpStatus: response.status,
            route: "/api/sync/profile"
          }
        )
        setStatus(body.error ?? "Could not delete synced profile")
        return
      }

      if (profileSyncTimeoutRef.current) {
        clearTimeout(profileSyncTimeoutRef.current)
        profileSyncTimeoutRef.current = null
      }

      const nextState = {
        ...state,
        profile: emptyProfile
      }

      setProfileAccountSyncEnabled(false)
      setState(nextState)
      saveState(nextState, userId)
      setStatus("Profile deleted for this account. Account sync is off.")
    } catch (error: unknown) {
      logDashboardActionFailure("delete synced profile fetch", error, {
        route: "/api/sync/profile"
      })
      setStatus(
        error instanceof Error ? error.message : "Could not delete profile"
      )
    }
  }

  const getCapabilityInput = (
    overrides: Partial<CapabilityReadinessInput> = {}
  ): CapabilityReadinessInput => {
    const hasCareerEvidence = Boolean(
      state.profile.baseCvText.trim() ||
        state.profile.experienceHighlights.trim() ||
        state.profile.projectSummaries.trim()
    )
    const hasConfirmedSupportingEvidence = Boolean(
      hasCareerEvidence ||
        (state.evidenceRecords ?? []).some(
          (record) => record.status === "found"
        )
    )
    const base: CapabilityReadinessInput = {
      authenticated: Boolean(userId),
      evidence: {
        cv: Boolean(state.profile.baseCvText.trim()),
        // CandidateProfile has no dedicated education field - baseCvText is
        // the only place education credentials could actually appear, so
        // this was a copy-paste of the "projects" line below rather than a
        // genuine independent education signal.
        education: Boolean(state.profile.baseCvText.trim()),
        experience: Boolean(state.profile.experienceHighlights.trim()),
        projects: Boolean(state.profile.projectSummaries.trim()),
        confirmedSkills: Boolean(state.jobAnalysis.skills?.length),
        supportingEvidenceConfirmed: hasConfirmedSupportingEvidence
      },
      preferences: {
        basicWorkPreferences: Boolean(
          state.profile.targetRoles.trim() ||
            state.profile.relocationWillingness
        ),
        careerLane: Boolean(state.profile.targetRoles.trim()),
        salaryPreference: Boolean(state.profile.salaryExpectation.trim()),
        targetCountry: Boolean(state.profile.targetCountries.trim()),
        vacancyCountry: Boolean(state.jobAnalysis.location.trim()),
        workAuthorisationStructured: Boolean(
          state.profile.workRightDetails.trim()
        )
      },
      job: {
        analysed: Boolean(state.jobAnalysis.fitScore),
        description: Boolean(state.jobAnalysis.jobDescription.trim()),
        selected: Boolean(activeKitApplication)
      },
      application: {
        generatedAnswerAvailable: Boolean(kitDraft),
        evidenceUseConfirmed: false,
        explicitReview: false
      }
    }
    return {
      ...base,
      ...overrides,
      evidence: { ...base.evidence, ...overrides.evidence },
      preferences: { ...base.preferences, ...overrides.preferences },
      job: { ...base.job, ...overrides.job },
      application: { ...base.application, ...overrides.application },
      autofill: { ...base.autofill, ...overrides.autofill }
    }
  }

  const requireCapability = (
    capability: ProductCapability,
    overrides: Partial<CapabilityReadinessInput> = {}
  ) => {
    const readiness = evaluateCapabilityReadiness(
      capability,
      getCapabilityInput(overrides),
      window.location.pathname
    )
    if (readiness.state !== "needs_information") {
      return true
    }
    setStatus(
      `${readiness.explanation} ${readiness.requiredMissing
        .map((item) => item.label)
        .join(", ")}.`
    )
    return false
  }

  const confirmApplicationEvidenceUse = () => {
    const evidenceReady = getCapabilityInput().evidence
      ?.supportingEvidenceConfirmed
    if (!evidenceReady) {
      setStatus(
        "Add and confirm supporting evidence before preparing application material."
      )
      return false
    }
    return window.confirm(
      "Confirm that you reviewed the selected job and the saved evidence that AutoTime will use. Continue?"
    )
  }
  const contextualCapability =
    currentTab === "jobs"
      ? "analyse_job"
      : currentTab === "applications" ||
          activeFocus === "application-answers" ||
          activeFocus === "cv-tailor"
        ? "prepare_application"
        : currentTab === "interview"
          ? "prepare_interview"
          : null
  const contextualReadiness = contextualCapability
    ? evaluateCapabilityReadiness(
        contextualCapability,
        getCapabilityInput(),
        `/dashboard/${
          contextualCapability === "analyse_job"
            ? "jobs"
            : contextualCapability === "prepare_interview"
              ? "interview"
              : "applications"
        }`
      )
    : null

  const activeInterviewQuestion =
    customInterviewQuestion.trim() || interviewQuestion
  const interviewDisclaimer = getInterviewBuddyDisclaimer(
    activeInterviewQuestion
  )
  const finalAnswerStorageKey = inferReusableAnswerKey(activeInterviewQuestion)
  const hasInterviewDraftAnswer = Boolean(interviewDraftAnswer.trim())
  const hasProofLibraryInterviewContent = Boolean(
    getProofLibraryContextForInterview(state.reusableAnswers).trim()
  )
  const hasInterviewBuddyOutputs = Boolean(
    interviewBuddyOutputs.strongFinalAnswer.trim()
  )
  const actionPanelTitle = isProfileGateRequired
    ? "Evidence gate is locked."
    : isOverview
      ? "What do you want to do now?"
      : currentTab === "jobs"
        ? "Check fit before applying."
        : activeFocus === "application-answers"
          ? "Prepare application content for one tracked job."
          : activeFocus === "cv-tailor"
            ? "Keep reusable proof ready without duplicating other workflows."
            : activeFocus === "follow-ups"
              ? "Work the next action in order."
              : activeFocus === "insights"
                ? "Review outcomes without changing the workflow."
            : currentTab === "profile"
          ? "Add the details AutoTime needs about you."
          : currentTab === "applications"
            ? "Review tracked jobs and update the next step."
            : "Add notes, then run the interview coach."
  const actionPanelStateLabel = isProfileGateRequired
    ? "Your profile needs more verified evidence before AutoTime can avoid generic advice."
    : isOverview
      ? profileReadyForExecution
        ? "Your profile is ready for job checks"
        : "Profile evidence still needs work before the best outcomes."
        : currentTab === "jobs"
          ? hasJobDraft(state.jobAnalysis)
            ? "Role ready"
            : "Add role details"
        : activeFocus === "application-answers"
          ? activeKitApplication
            ? "Draft content is tied to a tracked job"
            : "Track a job first, then write application content"
          : activeFocus === "cv-tailor"
            ? "Proof Library is saved with your profile"
            : activeFocus === "follow-ups"
              ? activeActionCount > 0
                ? "Only scheduled or in-flight jobs appear here"
                : "No dated or in-flight actions are waiting"
              : activeFocus === "insights"
                ? outcomeAnalytics.total > 0
                  ? "Progress is reading saved outcome records"
                  : "Save job outcomes before reading progress"
            : currentTab === "profile"
          ? profileReadyForExecution
            ? "Profile ready for job checks"
            : "Profile evidence still needs work to unlock tools."
          : currentTab === "applications"
            ? activeActionCount > 0
              ? "Next actions are waiting"
              : "No urgent next action"
            : hasInterviewBuddyOutputs
              ? "Answer ready to save"
              : hasInterviewDraftAnswer
                ? hasProofLibraryInterviewContent
                  ? "Rough answer ready for coaching"
                  : "Add Proof Library proof before coaching"
                : "Add your rough answer first"
  const actionPanelStatus = isCopilotThinking
    ? "Working"
    : isProfileGateRequired
      ? "Locked"
      : isOverview && !profileReadyForExecution
        ? "Start here"
        : currentTab === "jobs" && !hasJobDraft(state.jobAnalysis)
          ? "Input needed"
          : currentTab === "profile" && !profileReadyForExecution
            ? "Incomplete"
            : currentTab === "interview" &&
                (!hasInterviewDraftAnswer || !hasProofLibraryInterviewContent)
              ? "Input needed"
              : "Ready"

  const generateInterviewBuddyAnswers = async () => {
    if (
      !requireCapability("prepare_interview", {
        job: { selected: Boolean(selectedApplication || activeKitApplication) }
      })
    ) {
      return
    }

    if (!activeInterviewQuestion.trim()) {
      setStatus("Choose or type an interview question first")
      return
    }

    if (!interviewDraftAnswer.trim()) {
      setStatus("Add your rough draft answer first")
      return
    }

    const validationError = validateInterviewBuddyInput({
      draft: interviewDraftAnswer,
      question: activeInterviewQuestion
    })

    if (!hasProofLibraryInterviewContent) {
      setStatus(
        "Add a motivation, strength or availability proof in Proof Library before running the coach"
      )
      return
    }

    if (validationError) {
      setInterviewBuddyOutputs(emptyInterviewBuddyOutputs)
      setInterviewCoachMeta(emptyInterviewCoachMeta)
      setStatus(validationError)
      return
    }

    const localOutputs = createInterviewBuddyOutputs({
      draft: interviewDraftAnswer,
      profile: state.profile,
      question: activeInterviewQuestion,
        reusableAnswers: state.reusableAnswers
    })
    const localCoachMeta = createLocalInterviewCoachMeta({
      draft: interviewDraftAnswer,
      profile: state.profile,
      question: activeInterviewQuestion,
        reusableAnswers: state.reusableAnswers
    })

    setIsCopilotThinking(true)
    setStatus("Preparing interview answer options...")

    try {
      const response = await fetch("/api/ai/interview-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: interviewDraftAnswer,
          job: state.jobAnalysis,
          profile: state.profile,
          question: activeInterviewQuestion,
        reusableAnswers: state.reusableAnswers
        })
      })
      const body = (await response.json()) as {
        data: {
          coach?: InterviewBuddyOutputs & Omit<InterviewCoachMeta, "source">
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || !body.data?.coach) {
        logDashboardActionFailure(
          "generate interview coach response",
          body.error ?? "Interview coach unavailable",
          {
            httpStatus: response.status,
            route: "/api/ai/interview-answer"
          }
        )
        if (body.data?.upgradeUrl) {
          setStatus(
            `${body.error ?? "Upgrade required"} Open pricing to continue.`
          )
        } else {
          setStatus(
            body.error ?? "Interview coach unavailable. Local check used."
          )
        }
        setInterviewBuddyOutputs(localOutputs)
        setInterviewCoachMeta(localCoachMeta)
        return
      }

      const coach = body.data.coach
      setInterviewBuddyOutputs({
        professionalAnswer:
          coach.professionalAnswer || localOutputs.professionalAnswer,
        naturalAnswer: coach.naturalAnswer || localOutputs.naturalAnswer,
        lightFunnyAnswer:
          coach.lightFunnyAnswer || localOutputs.lightFunnyAnswer,
        strongFinalAnswer:
          coach.strongFinalAnswer || localOutputs.strongFinalAnswer
      })
      setInterviewCoachMeta({
        evidenceScore: coach.evidenceScore,
        riskFlags: coach.riskFlags,
        missingEvidence: coach.missingEvidence,
        followUpDrills: coach.followUpDrills,
        boundaryNote: coach.boundaryNote,
        source: "ai"
      })
      setStatus("Interview answer options generated")
      setTimeout(() => setStatus(""), 3000)
    } catch (error: unknown) {
      logDashboardActionFailure("generate interview coach fetch", error, {
        route: "/api/ai/interview-answer"
      })
      setInterviewBuddyOutputs(localOutputs)
      setInterviewCoachMeta(localCoachMeta)
      setStatus(
        error instanceof Error
          ? `Interview coach unavailable. Local check used: ${error.message}`
          : "Interview coach unavailable. Local check used."
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const generateLocalInterviewBuddyAnswers = () => {
    if (
      !requireCapability("prepare_interview", {
        job: { selected: Boolean(selectedApplication || activeKitApplication) }
      })
    ) {
      return
    }

    const validationError = validateInterviewBuddyInput({
      draft: interviewDraftAnswer,
      question: activeInterviewQuestion
    })

    if (!hasProofLibraryInterviewContent) {
      setStatus(
        "Add a motivation, strength or availability proof in Proof Library before running the local check"
      )
      return
    }

    if (validationError) {
      setInterviewBuddyOutputs(emptyInterviewBuddyOutputs)
      setInterviewCoachMeta(emptyInterviewCoachMeta)
      setStatus(validationError)
      return
    }

    setInterviewBuddyOutputs(
      createInterviewBuddyOutputs({
        draft: interviewDraftAnswer,
        profile: state.profile,
        question: activeInterviewQuestion,
        reusableAnswers: state.reusableAnswers
      })
    )
    setInterviewCoachMeta(
      createLocalInterviewCoachMeta({
        draft: interviewDraftAnswer,
        profile: state.profile,
        question: activeInterviewQuestion,
        reusableAnswers: state.reusableAnswers
      })
    )
    setStatus("Local interview check generated from your draft")
  }

  const generateTechnicalInterviewDrills = async () => {
    if (
      !requireCapability("prepare_interview", {
        job: { selected: Boolean(selectedApplication || activeKitApplication) }
      })
    ) {
      return
    }

    const localDrills = createTechnicalInterviewDrills({
      difficulty: technicalInterviewDifficulty,
      focus: technicalInterviewFocus,
      job: state.jobAnalysis,
      profile: state.profile
    })

    setIsCopilotThinking(true)
    setStatus("Generating advanced technical interview drills...")

    try {
      const response = await fetch("/api/ai/technical-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: technicalInterviewDifficulty,
          focus: technicalInterviewFocus,
          job: state.jobAnalysis,
          profile: state.profile
        })
      })
      const body = (await response.json()) as {
        data: {
          drills?: Array<Omit<TechnicalInterviewDrill, "id">>
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || !body.data?.drills?.length) {
        logDashboardActionFailure(
          "generate technical interview drills response",
          body.error ?? "Technical interview drill AI unavailable",
          {
            httpStatus: response.status,
            route: "/api/ai/technical-interview"
          }
        )
        setTechnicalInterviewDrills(localDrills)
        setStatus(
          body.data?.upgradeUrl
            ? "AI quota used. Local proof-led technical drills are ready; upgrade to Pro for AI-generated variations."
            : body.error
              ? `AI technical drills unavailable. Local drills used: ${body.error}`
              : "AI technical drills unavailable. Local drills used."
        )
        return
      }

      setTechnicalInterviewDrills(
        body.data.drills.map((drill, index) => ({
          ...drill,
          id: `ai-${technicalInterviewFocus}-${technicalInterviewDifficulty}-${index}`
        }))
      )
      setStatus("AI technical interview drills generated")
      setTimeout(() => setStatus(""), 3000)
    } catch (error: unknown) {
      logDashboardActionFailure("generate technical interview drills fetch", error, {
        route: "/api/ai/technical-interview"
      })
      setTechnicalInterviewDrills(localDrills)
      setStatus(
        error instanceof Error
          ? `AI technical drills unavailable. Local drills used: ${error.message}`
          : "AI technical drills unavailable. Local drills used."
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const saveFinalInterviewAnswer = () => {
    if (
      !requireCapability("prepare_interview", {
        job: { selected: Boolean(selectedApplication || activeKitApplication) }
      })
    ) {
      return
    }

    if (!interviewBuddyOutputs.strongFinalAnswer.trim()) {
      setStatus("Generate a strong final answer before saving")
      return
    }

    const next = {
      ...state,
      reusableAnswers: {
        ...state.reusableAnswers,
        [finalAnswerStorageKey]: interviewBuddyOutputs.strongFinalAnswer
      }
    }

    persist(
      next,
      `Interview Answer Bank updated in Proof Library: ${getReusableAnswerLabel(finalAnswerStorageKey)}`
    )
    scheduleDashboardSync(next, {
      failureMessage: "Interview answer saved locally. Dashboard sync failed",
      successMessage: "Interview Answer Bank saved and synced"
    })
  }

  const speakInterviewAnswer = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("Text-to-speech is not available in this browser")
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const dismissFirstRunWalkthrough = () => {
    window.localStorage.setItem(
      getUserScopedStorageKey(walkthroughStorageKey, userId),
      "true"
    )
    setShowFirstRunWalkthrough(false)
  }

  const profileGatePanel = isProfileGateRequired ? (
    <section
      className="profile-required-panel locked"
      aria-label="Profile evidence gate locked"
    >
      <div className="profile-required-heading">
        <span className="profile-lock-symbol" aria-hidden="true" />
        <div>
          <p className="eyebrow">Profile evidence gate</p>
          <h2>Locked until your candidate evidence is ready</h2>
          <p>
            AutoTime unlocks job checks, tracker actions and interview prep
            once your profile has enough detail.
          </p>
        </div>
      </div>
      <details className="profile-required-details">
        <summary>View required evidence in order</summary>
        <ol className="bullets-list lock-proof-list">
          {profileGateItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>Interview answers use your saved profile details.</li>
        </ol>
      </details>
      <Link className="secondary-button" href="/dashboard/profile-evidence">
        Unlock profile
      </Link>
    </section>
  ) : null

  return (
    <main
      className={`dashboard-shell${currentTab === "profile" ? " phase-seven-profile" : ""}`}
    >
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">{focusCopy.eyebrow}</p>
          <h1>{focusCopy.title}</h1>
          <p>{focusCopy.body}</p>
          <p className="decision-method-note">
            Private Beta v1: limited early access with founder-led onboarding
            and feedback-led improvement.
          </p>
          {showHeaderJobActions ? (
            <div className="command-header-tools">
              {currentTab !== "jobs" ? (
                <Link className="secondary-button" href="/dashboard/match-score">
                  Check EU fit
                </Link>
              ) : null}
              <Link className="secondary-button" href="/dashboard/applications">
                Tracked Jobs
              </Link>
            </div>
          ) : null}
        </div>
        <div className="header-summary-column">
          <div className="profile-completion-meter" aria-label="Profile readiness">
            <small>Profile readiness</small>
            <strong>{readinessScore}%</strong>
            <span aria-hidden="true">
              <i style={{ width: `${readinessScore}%` }} />
            </span>
          </div>
          {showExecutivePanel ? (
            <div
              className={`executive-panel tone-${decisionTone}`}
              aria-label="Dashboard summary"
            >
              <p>
                <small>Next best action</small>
                <span>
                  {profileReadyForExecution
                    ? fitEvaluation.decision
                    : "Improve profile evidence before checking more jobs"}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </header>

      {showFirstRunWalkthrough ? (
        <details className="walkthrough-inline-panel">
          <summary>Setup guide</summary>
          <section aria-labelledby="first-run-walkthrough-title">
            <div className="walkthrough-copy">
              <p className="eyebrow">First login walkthrough</p>
              <h2 id="first-run-walkthrough-title">
                See the AutoTime workflow before you start
              </h2>
              <p>
                Better applications beat more applications. Watch the short
                product walkthrough, then start with your evidence profile so
                job checks, tracker actions and interview prep make sense from the
                first role.
              </p>
            </div>
            <video
              controls
              preload="metadata"
              src="/demo/autotime-first-user-demo.mp4"
            >
              Your browser does not support the walkthrough video.
            </video>
            <ol
              className="walkthrough-steps"
              aria-label="AutoTime setup order"
            >
              <li>Profile evidence</li>
              <li>Extension capture</li>
              <li>Quality job check</li>
              <li>Tracker next action</li>
              <li>Interview coach</li>
            </ol>
            <div className="walkthrough-actions">
              <a
                href="/dashboard/profile-evidence"
                onClick={dismissFirstRunWalkthrough}
              >
                Start setup
              </a>
              <button
                className="secondary-button"
                type="button"
                onClick={dismissFirstRunWalkthrough}
              >
                Continue to dashboard
              </button>
            </div>
          </section>
        </details>
      ) : null}

      {status && (
        <p
          aria-live="polite"
          className={`status-banner ${getStatusTone(status)}`}
          role="status"
        >
          {status}
        </p>
      )}

      {contextualReadiness ? (
        <CapabilityReadinessNotice readiness={contextualReadiness} />
      ) : null}

      <div className="command-workspace">
        <div
          className={
            isProfileGateRequired
              ? "command-content profile-gate-flow"
              : "command-content"
          }
        >
          {profileGatePanel}

          <div
            className={
              isDashboardProtocolLocked
                ? "dashboard-section-lock locked"
                : "dashboard-section-lock"
            }
          >
            {isDashboardProtocolLocked ? (
              <div className="dashboard-lock-overlay" role="note">
                <span className="profile-lock-symbol" aria-hidden="true" />
                <div>
                  <p className="eyebrow">Profile protocol</p>
                  <h2>Locked until profile reaches 90%</h2>
                  <p>
                    Complete your Profile Evidence before using dashboard
                    tools. Current profile readiness is {readinessScore}%.
                  </p>
                </div>
                <Link className="secondary-button" href="/dashboard/profile-evidence">
                  Complete profile
                </Link>
              </div>
            ) : null}
            <div
              aria-disabled={isDashboardProtocolLocked}
              className="dashboard-section-lock-content"
            >
              {showActionPanel ? (
                <section className="ai-copilot-panel" aria-label="Guided actions">
              <div className="ai-copilot-header">
                <div>
                  <p className="eyebrow">{actionPanelEyebrow}</p>
                  <h2>{actionPanelTitle}</h2>
                  <p>{actionPanelStateLabel}</p>
                </div>
                <span
                  className={
                    isProfileGateRequired ? "status-lock-pill" : undefined
                  }
                >
                  {actionPanelStatus}
                </span>
              </div>
              <div className="ai-action-row">
                {isOverview ? (
                  <>
                    <a
                      className="secondary-button"
                      href="/dashboard/profile-evidence"
                    >
                      Finish profile
                    </a>
                    {profileReadyForExecution ? (
                      <>
                        <Link
                          className="secondary-button"
                          href="/dashboard/match-score"
                        >
                          Check EU fit
                        </Link>
                        <Link
                          className="secondary-button"
                          href="/dashboard/applications"
                        >
                          Open tracker
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : isProfileGateRequired ? (
                  <a
                    className="secondary-button"
                    href="/dashboard/profile-evidence"
                  >
                    Complete profile
                  </a>
                ) : activeFocus === "application-answers" ? (
                  <>
                    <button
                      disabled={!activeKitApplication || isCopilotThinking}
                      type="button"
                      onClick={regenerateKitDraft}
                    >
                      {isCopilotThinking ? "Generating kit" : "Generate application kit"}
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!activeKitApplication || !kitDraft}
                      type="button"
                      onClick={saveApplicationKitSnapshot}
                    >
                      Save kit to job
                    </button>
                  </>
                ) : activeFocus === "cv-tailor" ? (
                  <>
                    <a
                      className="secondary-button"
                      href="/dashboard/profile-evidence"
                    >
                      Update source profile
                    </a>
                    <a
                      className="secondary-button"
                      href="/dashboard/application-answers"
                    >
                      Write from proof
                    </a>
                  </>
                ) : currentTab === "profile" ? (
                  <>
                    <button
                      className="secondary-button"
                      disabled={!canReviewResumeWithAi || isReviewingCv}
                      type="button"
                      onClick={reviewResumeForContext}
                    >
                      {isReviewingCv ? "Reviewing CV" : "Review CV"}
                    </button>
                    <button type="button" onClick={applyMarketContextToProfile}>
                      Apply market context
                    </button>
                  </>
                ) : activeFocus === "follow-ups" ? (
                  <>
                    <Link className="secondary-button" href="/dashboard/applications">
                      Open tracked jobs
                    </Link>
                    <Link className="secondary-button" href="/dashboard/insights">
                      Review progress
                    </Link>
                  </>
                ) : activeFocus === "insights" ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={runOnlineAnalytics}
                    >
                      Run evidence report
                    </button>
                    <Link className="secondary-button" href="/dashboard/applications">
                      Open tracked jobs
                    </Link>
                  </>
                ) : currentTab === "applications" ? (
                  <>
                    <Link className="secondary-button" href="/dashboard/follow-ups">
                      Open follow-ups
                    </Link>
                    <Link className="secondary-button" href="/dashboard/interview">
                      Open interview prep
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      disabled={
                        !hasInterviewDraftAnswer ||
                        !hasProofLibraryInterviewContent ||
                        isCopilotThinking
                      }
                      type="button"
                      onClick={generateInterviewBuddyAnswers}
                    >
                      {isCopilotThinking ? "Coaching..." : "Run coach"}
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!hasInterviewBuddyOutputs}
                      type="button"
                      onClick={saveFinalInterviewAnswer}
                    >
                      Save to Interview Bank
                    </button>
                  </>
                )}
              </div>
                </section>
              ) : null}

              <>
              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "settings" && (
                  <section
                    className="settings-hub-panel"
                    aria-label="Settings overview"
                  >
                    <div className="section-intro">
                      <p className="eyebrow">Your workspace</p>
                      <h2>Choose how AutoTime supports you</h2>
                      <p>
                        Keep profile saving, extension capture and account
                        choices simple from one place.
                      </p>
                    </div>
                    <div className="settings-hub-grid">
                      <article>
                        <span>Profile readiness</span>
                        <strong>
                          <RevealMetric label="Show profile quality score">
                            {profileQualityScore}/100
                          </RevealMetric>
                        </strong>
                        <p>
                          Candidate evidence, work-right details and role
                          targets.
                        </p>
                        <Link href="/dashboard/profile-evidence">Edit profile</Link>
                      </article>
                      <article>
                        <span>Account saving</span>
                        <strong>{cloudSyncReadiness.modeLabel}</strong>
                        <p>
                          {cloudSyncConsent
                            ? "Profile and workflow saving is enabled for this signed-in account."
                            : "Browser cache is active until account sync is configured."}
                        </p>
                        <a href="#account-sync-settings">Review saving</a>
                      </article>
                      <article>
                        <span>Sign-in methods</span>
                        <strong>Google + GitHub</strong>
                        <p>
                          Link both providers to keep one AutoTime profile and
                          billing account.
                        </p>
                        <a href="#linked-sign-in-methods">Link accounts</a>
                      </article>
                      <article>
                        <span>Extension</span>
                        <strong>
                          {state.applications.some(
                            (application) =>
                              getApplicationCaptureMode(application)
                                .className === "automatic"
                          )
                            ? "Capturing jobs"
                            : "Not proven yet"}
                        </strong>
                        <p>
                          Connect Chrome to parse JDs and prove job source
                          quality.
                        </p>
                        <Link href="/dashboard/extension">Open extension</Link>
                      </article>
                      <article>
                        <span>Plan</span>
                        <strong>
                          {isCopilotThinking ? "Working" : "Ready"}
                        </strong>
                        <p>
                          See what is included and what unlocks after profile
                          completion.
                        </p>
                        <Link href="/pricing">View pricing</Link>
                      </article>
                      <article>
                        <span>Your data</span>
                        <strong>Backup / delete</strong>
                        <p>
                          Keep a backup or remove saved profile data when you
                          need to.
                        </p>
                        <a href="#account-sync-settings">Manage data</a>
                      </article>
                    </div>
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "settings" && (
                  <section id="linked-sign-in-methods">
                    <AccountIdentityLinker />
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                showProfileSettingsPanel && (
                  <section
                    className={
                      activeFocus === "profile-evidence"
                        ? "market-context-panel profile-evidence-redesign"
                        : "market-context-panel"
                    }
                    aria-label="Profile settings"
                  >
                    <section
                      className="resume-intake-panel"
                      aria-label="CV context review"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Start with your CV</p>
                        <h2>Start with your CV</h2>
                        <p>
                          Import or paste your CV first. AutoTime suggests
                          profile fields, then you approve only the facts that
                          are correct.
                        </p>
                      </div>
                      <div className="context-explainer">
                        <article>
                          <span>1</span>
                          <p>
                            Import or paste your CV, then run Review CV
                            to generate suggested profile fields.
                          </p>
                        </article>
                        <article>
                          <span>2</span>
                          <p>
                            Review the suggestions and click Apply approved
                            suggestions only when the facts are correct.
                          </p>
                        </article>
                        <article>
                          <span>3</span>
                          <p>
                            Adjust role focus, work authorisation status, target
                            country, experience level and search pace if needed.
                          </p>
                        </article>
                      </div>
                      <label>
                        CV or profile text
                        <textarea
                          placeholder="Import or paste your CV, resume, or LinkedIn summary. AutoTime will suggest profile updates for you to approve."
                          value={resumeIntake}
                          onChange={(event) =>
                            setResumeIntake(event.target.value)
                          }
                        />
                      </label>
                      <div className="header-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => resumeFileInputRef.current?.click()}
                        >
                          Import CV file
                        </button>
                        <input
                          ref={resumeFileInputRef}
                          accept=".docx,.txt,.md,.markdown,.csv,.json,.rtf,text/*"
                          aria-label="Import CV file"
                          className="hidden-file-input"
                          tabIndex={-1}
                          type="file"
                          onChange={importResumeFile}
                        />
                        <button
                          className="secondary-button"
                          disabled={!canReviewResumeWithAi || isReviewingCv}
                          type="button"
                          onClick={reviewResumeForContext}
                        >
                          {isReviewingCv ? "Reviewing CV" : "Review CV"}
                        </button>
                        <button
                          className="secondary-button"
                          disabled={!contextSuggestion}
                          type="button"
                          onClick={approveContextSuggestion}
                        >
                          Apply approved suggestions
                        </button>
                      </div>
                      <p className="profile-action-hint">
                        Import or paste at least 40 characters, review it,
                        then approve the suggested fields before saving to your
                        profile.
                      </p>
                      <CvReviewSuggestionPanel
                        contextSuggestion={contextSuggestion}
                        contextSuggestionNote={contextSuggestionNote}
                        contextSuggestionSource={contextSuggestionSource}
                        isReviewingCv={isReviewingCv}
                      />
                    </section>

                    <div className="section-intro">
                      <p className="eyebrow">Your goals</p>
                      <h2>Check and refine your profile direction</h2>
                      <p>
                        After applying CV suggestions, fine-tune the direction
                        AutoTime should use for job checks and application
                        content.
                      </p>
                    </div>

                    <div className="context-grid">
                      <fieldset className="segmented-field">
                        <legend>Target role focus</legend>
                        <div className="segmented-options">
                          {roleMarkets.map((market) => (
                            <button
                              aria-pressed={
                                productContext.roleMarket === market.id
                              }
                              className={
                                productContext.roleMarket === market.id
                                  ? "segment-button active"
                                  : "segment-button"
                              }
                              key={market.id}
                              type="button"
                              onClick={() =>
                                updateProductContext("roleMarket", market.id)
                              }
                            >
                              <strong>{market.label}</strong>
                              <span>{market.description}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="segmented-field">
                        <legend>Work authorisation status</legend>
                        <div className="segmented-options">
                          {candidatePositions.map((position) => (
                            <button
                              aria-pressed={
                                productContext.candidatePosition === position.id
                              }
                              className={
                                productContext.candidatePosition === position.id
                                  ? "segment-button active"
                                  : "segment-button"
                              }
                              key={position.id}
                              type="button"
                              onClick={() =>
                                updateProductContext(
                                  "candidatePosition",
                                  position.id
                                )
                              }
                            >
                              <strong>{position.label}</strong>
                              <span>{position.description}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <div className="context-controls">
                        <label>
                          Target country
                          <select
                            value={productContext.targetCountry}
                            onChange={(event) =>
                              updateProductContext(
                                "targetCountry",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Choose target country</option>
                            {euCountryOptions.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Experience level
                          <select
                            value={productContext.experienceLevel}
                            onChange={(event) =>
                              updateProductContext(
                                "experienceLevel",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Choose experience level</option>
                            {experienceLevelOptions.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Search pace
                          <select
                            value={productContext.urgency}
                            onChange={(event) =>
                              updateProductContext(
                                "urgency",
                                event.target.value as CandidateUrgency | ""
                              )
                            }
                          >
                            <option value="">Choose search pace</option>
                            {urgencyOptions.map((urgency) => (
                              <option key={urgency.id} value={urgency.id}>
                                {urgency.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={!canApplyMarketContext}
                          onClick={applyMarketContextToProfile}
                        >
                          Apply to My Profile
                        </button>
                      </div>
                    </div>

                    <p className="context-guidance">
                      {getCountryGuidance(productContext)}
                    </p>
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus !== "settings" &&
                activeFocus !== "cv-tailor" && (
                  <section
                    className={
                      profileReadyForExecution
                        ? "profile-bridge-panel ready"
                        : "profile-bridge-panel blocked"
                    }
                    aria-label="Profile readiness"
                  >
                    <div>
                      <p className="eyebrow">Profile readiness</p>
                      <h2>
                        {!profileReadyForExecution ? (
                          <span
                            className="inline-lock-symbol"
                            aria-hidden="true"
                          />
                        ) : null}
                        {profileReadyForExecution
                          ? "Profile is ready"
                          : "Evidence gate locked"}
                      </h2>
                      <p>
                        Add enough candidate evidence before using job checks,
                        tracker actions or interview prep. This keeps the
                        workflow specific to your real profile.
                      </p>
                    </div>
                    {profileReadyForExecution ? (
                      <ul className="bullets-list">
                        <li>
                          Your profile can support job-fit scores and next
                          steps.
                        </li>
                        <li>
                          Work-right and country details are available for
                          checks.
                        </li>
                        <li>You can export a backup any time.</li>
                      </ul>
                    ) : (
                      <ul className="bullets-list">
                        {profileGateItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "profile-evidence" && (
                <section className="workspace-grid profile-evidence-redesign">
                  <div className="input-column">
                    <section
                      className="profile-purpose-panel"
                      aria-label="Profile purpose"
                    >
                      <div className="profile-purpose-main">
                        <div>
                          <p className="eyebrow">My Profile</p>
                          <h2>Your candidate evidence workspace</h2>
                          <p>
                            This is your private evidence space. AutoTime uses
                            it to check jobs, explain risks and keep answers
                            truthful.
                          </p>
                        </div>
                        <div className="profile-readiness-badge">
                          <span>Profile</span>
                          <strong>{readinessScore}%</strong>
                          <small>
                            {profileReadyForExecution
                              ? "Unlocked"
                              : "Complete to unlock"}
                          </small>
                          <em aria-hidden="true">
                            <i
                              style={{
                                width: `${Math.min(100, readinessScore)}%`
                              }}
                            />
                          </em>
                        </div>
                      </div>
                      <div className="profile-purpose-steps">
                        {[
                          ["profile-step-about-you", "About you"],
                          ["profile-step-work-rights", "Work rights"],
                          ["profile-step-target-roles", "Target roles"],
                          ["profile-step-proof", "CV proof"],
                          ["profile-step-proof", "Reusable answers"],
                        ].map(([sectionId, label]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              document
                                .getElementById(sectionId)
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        className="danger-button"
                        style={{ justifySelf: "start" }}
                        type="button"
                        onClick={resetProfile}
                      >
                        Reset profile
                      </button>
                    </section>
                    <div className="profile-form-toolbar">
                      <div>
                        <p className="eyebrow">Account profile</p>
                        <h2>Profile saves automatically</h2>
                        <p>
                          Changes are saved to this signed-in account when
                          account saving is available. This browser also keeps
                          a recovery backup.
                        </p>
                      </div>
                      <div className="profile-form-actions">
                        <span
                          className={
                            cloudSyncReadiness.configured
                              ? "sync-status-pill ready"
                              : "sync-status-pill warning"
                          }
                        >
                          {cloudSyncReadiness.configured
                            ? "Auto-save on"
                            : "Browser backup only"}
                        </span>
                        <details className="profile-action-details">
                          <summary>Account saving status</summary>
                          <label className="sync-consent-control">
                            <input
                              checked={cloudSyncConsent}
                              disabled={!cloudSyncReadiness.configured}
                              type="checkbox"
                              onChange={(event) => {
                                if (cloudSyncReadiness.configured) {
                                  setCloudSyncConsent(true)
                                  setProfileAccountSyncEnabled(true)
                                  setStatus(
                                    "Account saving stays on in production so this profile follows your signed-in account."
                                  )
                                  return
                                }

                                if (event.target.checked) {
                                  setCloudSyncConsent(true)
                                  return
                                }

                                setProfileAccountSyncEnabled(false)
                              }}
                            />
                            <span>
                              Keep my profile and job tracker saved to this
                              account.
                            </span>
                          </label>
                          <div className="profile-action-row">
                            <button
                              className="secondary-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={syncProfileToCloud}
                            >
                              Retry profile save
                            </button>
                            <button
                              className="secondary-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={loadProfileFromCloud}
                            >
                              Restore profile from account
                            </button>
                          </div>
                          <div className="profile-action-row">
                            <button
                              className="secondary-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={syncDashboardToCloud}
                            >
                              Retry job tracker save
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={checkCloudSyncStatus}
                            >
                              Check account saving
                            </button>
                          </div>
                          <details className="sync-danger-details compact">
                            <summary>Remove account profile</summary>
                            <p>
                              Deletes the profile stored on this signed-in
                              account. The browser backup remains on this
                              device.
                            </p>
                            <button
                              className="danger-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={deleteProfileForAccount}
                            >
                              Delete account profile
                            </button>
                          </details>
                        </details>
                        <details className="profile-action-details">
                          <summary>Data export</summary>
                          <div className="profile-action-row">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={exportDashboard}
                            >
                              Export data
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                const backupsPanel =
                                  document.getElementById("dashboard-backups")
                                if (
                                  backupsPanel instanceof HTMLDetailsElement
                                ) {
                                  backupsPanel.open = true
                                }
                                backupsPanel?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start"
                                })
                              }}
                            >
                              Need to restore?
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>

                    <section
                      className="profile-form-section"
                      id="profile-step-about-you"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Step 1</p>
                        <h3>About you</h3>
                        <p>
                          Start with the basics AutoTime can safely use in
                          summaries and tracker notes.
                        </p>
                      </div>
                      <label>
                        Full name
                        <input
                          placeholder="Your full name"
                          value={state.profile.fullName}
                          onChange={(event) =>
                            updateProfile("fullName", event.target.value)
                          }
                        />
                      </label>
                      <small className="high-risk-field-note">
                        {getHighRiskProfileFieldReason("fullName")}
                      </small>
                      <label>
                        Current country
                        <input
                          placeholder="Example: United Kingdom"
                          value={state.profile.currentCountry}
                          onChange={(event) =>
                            updateProfile("currentCountry", event.target.value)
                          }
                        />
                      </label>
                      {mobilityPrefillNote.currentCountry ? (
                        <p>
                          Pre-filled from your saved{" "}
                          <Link href="/dashboard/international">Countries</Link>{" "}
                          profile. Edit it if this is not correct.
                        </p>
                      ) : null}
                      <label>
                        Current city
                        <input
                          placeholder="Example: London"
                          value={state.profile.currentCity}
                          onChange={(event) =>
                            updateProfile("currentCity", event.target.value)
                          }
                        />
                      </label>
                    </section>

                    <section
                      className="profile-form-section"
                      id="profile-step-target-roles"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Step 2</p>
                        <h3>What you are looking for</h3>
                        <p>
                          Add target countries and roles so job advice stays
                          specific to your search.
                        </p>
                      </div>
                      <label>
                        Target countries
                        <input
                          placeholder="Example: UK, Ireland, Netherlands, Germany"
                          value={state.profile.targetCountries}
                          onChange={(event) =>
                            updateProfile("targetCountries", event.target.value)
                          }
                        />
                      </label>
                      {mobilityPrefillNote.targetCountries ? (
                        <p>
                          Pre-filled from your saved{" "}
                          <Link href="/dashboard/international">Countries</Link>{" "}
                          profile. Edit it if this is not correct.
                        </p>
                      ) : null}
                      <label>
                        Target roles
                        <input
                          placeholder="Example: Business Analyst, Product Analyst, Application Support"
                          value={state.profile.targetRoles}
                          onChange={(event) =>
                            updateProfile("targetRoles", event.target.value)
                          }
                        />
                      </label>
                    </section>

                    <section
                      className="profile-form-section important"
                      id="profile-step-work-rights"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Step 3</p>
                        <h3>Work-right facts</h3>
                        <p>
                          Add only details you can verify. AutoTime will never
                          add work-right, visa or sponsorship details unless
                          you save them.
                        </p>
                      </div>
                      <label>
                        Work-right details
                        <textarea
                          placeholder="Example: UK citizen, settled/pre-settled status, Skilled Worker visa, EU citizen, or no sponsorship required. Add only facts you can verify."
                          value={state.profile.workRightDetails}
                          onChange={(event) =>
                            updateProfile(
                              "workRightDetails",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <small className="high-risk-field-note">
                        {getHighRiskProfileFieldReason("workRightDetails")}
                      </small>
                    </section>

                    <section
                      className="profile-form-section important"
                      id="profile-step-proof"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Step 4</p>
                        <h3>Your proof</h3>
                        <p>
                          Paste factual CV text, project evidence and
                          achievements.
                        </p>
                      </div>
                      <label>
                        CV text
                        <textarea
                          placeholder="Paste your CV text or a factual summary of roles, projects, tools, outcomes and responsibilities."
                          value={state.profile.baseCvText}
                          onChange={(event) =>
                            updateProfile("baseCvText", event.target.value)
                          }
                        />
                      </label>
                      <small className="high-risk-field-note">
                        {getHighRiskProfileFieldReason("baseCvText")}
                      </small>
                      <label>
                        Experience highlights
                        <textarea
                          placeholder="Add 2-3 factual highlights with tools, responsibilities and outcomes you can defend in an interview."
                          value={state.profile.experienceHighlights}
                          onChange={(event) =>
                            updateProfile(
                              "experienceHighlights",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <small className="high-risk-field-note">
                        {getHighRiskProfileFieldReason("experienceHighlights")}
                      </small>
                      <label>
                        Project or delivery examples
                        <textarea
                          placeholder="Add one project, delivery example or workflow improvement with the problem, action and result."
                          value={state.profile.projectSummaries}
                          onChange={(event) =>
                            updateProfile(
                              "projectSummaries",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <small className="high-risk-field-note">
                        {getHighRiskProfileFieldReason("projectSummaries")}
                      </small>
                    </section>
                  </div>

                  <div className="output-column">
                    <section className="panel profile-quality-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Profile status</p>
                        <h2>
                          {profileReadyForExecution
                            ? "Ready for job checks"
                            : "Profile needs more detail"}
                        </h2>
                        <p>
                          Keep these details accurate so job checks,
                          application drafts and interview prep use the right
                          facts.
                        </p>
                      </div>
                      <div className="profile-quality-list">
                        {profileQualitySignals.map((signal) => (
                          <article
                            className={`profile-quality-item ${signal.status}`}
                            key={signal.label}
                          >
                            <div>
                              <strong>{signal.label}</strong>
                              <span>
                                {getProfileSignalStatusLabel(signal.status)}
                              </span>
                            </div>
                            <p>{signal.detail}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">Profile summary</p>
                        <h2>Saved profile details</h2>
                        <p>
                          These details are currently available for job checks
                          and application workflows.
                        </p>
                      </div>
                      <dl className="summary-list">
                        <div>
                          <dt>Target roles</dt>
                          <dd>{state.profile.targetRoles || "Not set"}</dd>
                        </div>
                        <div>
                          <dt>Target countries</dt>
                          <dd>{state.profile.targetCountries || "Not set"}</dd>
                        </div>
                        <div>
                          <dt>Current location</dt>
                          <dd>
                            {[
                              state.profile.currentCity,
                              state.profile.currentCountry
                            ]
                              .filter(Boolean)
                              .join(", ") || "Not set"}
                          </dd>
                        </div>
                        <div>
                          <dt>Work-right evidence</dt>
                          <dd>
                            {state.profile.workRightDetails
                              ? "Saved"
                              : "Missing"}
                          </dd>
                        </div>
                        <div>
                          <dt>CV evidence</dt>
                          <dd>
                            {state.profile.baseCvText.trim()
                              ? `${state.profile.baseCvText.trim().length} characters saved`
                              : "Missing"}
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <details className="panel reusable-answers-panel">
                      <summary>
                        <span>
                          <small>Application answers</small>
                          <strong>Edit reusable answers</strong>
                        </span>
                      </summary>
                      <div className="reusable-answers-content">
                        <p>
                          Save reusable wording here only when it is true and
                          supported by your profile.
                        </p>
                        <label>
                          Motivation answer
                          <textarea
                            placeholder="Why this kind of role, company, or market makes sense for you."
                            value={state.reusableAnswers.motivationAnswer}
                            onChange={(event) =>
                              updateReusableAnswer(
                                "motivationAnswer",
                                event.target.value
                              )
                            }
                          />
                        </label>
                        <label>
                          Strengths answer
                          <textarea
                            placeholder="A factual strengths answer backed by experience, projects, tools, or outcomes."
                            value={state.reusableAnswers.strengthsAnswer}
                            onChange={(event) =>
                              updateReusableAnswer(
                                "strengthsAnswer",
                                event.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                </section>
              )}

              </>
            </div>
          </div>
        </div>
      </div>

      {!isOverview ? (
        <details
          id="dashboard-backups"
          aria-disabled={isDashboardProtocolLocked}
          className={
            isDashboardProtocolLocked ? "utility-bar locked" : "utility-bar"
          }
        >
          <summary>Data export</summary>
          <p className="backup-helper-text">
            Download your AutoTime data for your own records. Account saving
            stays automatic when available.
          </p>
          <div className="backup-actions">
            <div className="backup-action-group">
              <span>Export</span>
              <button
                className="secondary-button"
                disabled={isDashboardProtocolLocked}
                type="button"
                onClick={exportDashboard}
              >
                Export data
              </button>
            </div>
          </div>
          <details className="restore-data-details">
            <summary>Need to restore data?</summary>
            <div className="backup-import-group">
              <label className="import-control">
                Paste exported data
                <textarea
                  disabled={isDashboardProtocolLocked}
                  placeholder="Paste data exported from AutoTime"
                  value={importJson}
                  onChange={(event) => setImportJson(event.target.value)}
                />
              </label>
              <button
                className="secondary-button"
                disabled={isDashboardProtocolLocked}
                type="button"
                onClick={() => importDashboard(importJson)}
              >
                Restore data
              </button>
            </div>
          </details>
        </details>
      ) : null}
    </main>
  )
}
