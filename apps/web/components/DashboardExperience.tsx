"use client"

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { z } from "zod"
import {
  companionDashboardStateSchema,
  evaluateCountryFit,
  getCandidateProfileBridgeIssues,
  type ApplicationOutcomeReason,
  type ApplicationRecord,
  type ApplicationContentSnapshot,
  type ApplicationStatus,
  type CandidateProfile,
  type CompanionDashboardState,
  type CountryFitEvaluation,
  type EvidenceRecord,
  type JobAnalysisDraft,
  type OutcomeRecord,
  type OutcomeLearningSignals,
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
  prepareProfileSyncAction
} from "../lib/cloud-sync"
import {
  getProfileExecutionLockMessage,
  PROFILE_EXECUTION_THRESHOLD
} from "../lib/product-protocols"
import { profileProtocolReadinessEvent } from "./ProfileProtocolLock"
import { useDashboardPlan } from "./UserNav"

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
  | "autofill-profile"
  | "application-tracker"
  | "follow-ups"
  | "interview-prep"
  | "insights"
  | "settings"
type MetricTone = "neutral" | "good" | "warn"
type RoleMarket =
  | "general-tech"
  | "fintech"
  | "enterprise-saas"
  | "data-ai"
  | "cybersecurity"
  | "healthtech"
  | "climate-energy"
  | "gov-public"
  | "ecommerce-marketplace"
  | "devtools-cloud"
type CandidateMarketPosition = "foreign-candidate" | "native-candidate"
type CandidateUrgency = "urgent" | "active" | "exploring"

type ProductContext = {
  roleMarket: RoleMarket
  candidatePosition: CandidateMarketPosition
  urgency: CandidateUrgency
  targetCountry: string
  experienceLevel: string
}

type TrustState = {
  officialSourceReviewed: boolean
  officialSourceReviewedAt: string
}

type SyncPreferences = {
  profileAccountSyncEnabled: boolean
}

type ContextSuggestion = ProductContext & {
  targetRoles: string
  workRightPrompt: string
  confidence: "Low" | "Medium" | "High"
  reasons: string[]
}

type ContextSuggestionSource = "ai" | "local" | "limit" | "error" | null

type ProfileContextReviewResponse = {
  data: { suggestion: ContextSuggestion } | { upgradeUrl: string } | null
  error: string | null
}

type DecisionBrief = {
  decision: CountryFitEvaluation["decision"]
  confidence: "Low" | "Medium" | "High"
  score: number
  contentGate: CountryFitEvaluation["contentGate"]
  rationale: string[]
  evidenceFound: string[]
  risks: string[]
  nextActions: string[]
  missingInputs: string[]
}

type ProfileQualitySignal = {
  label: string
  score: number
  status: "ready" | "needs-check" | "blocked"
  detail: string
}

type OfficialSource = {
  label: string
  url: string
  note: string
}

type VerificationChecklistItem = {
  id: string
  label: string
  status: "ready" | "needs-check" | "blocked"
  evidence: string
  limit: string
}

type ContentGuardrail = {
  label: string
  status: "ready" | "warning" | "blocked"
  reason: string
}

type ReadyToApplyItem = {
  id: string
  label: string
  status: "ready" | "needs-check" | "blocked"
  evidence: string
  action: string
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

type InterviewBuddyOutputKey =
  | "professionalAnswer"
  | "naturalAnswer"
  | "lightFunnyAnswer"
  | "strongFinalAnswer"

type InterviewBuddyOutputs = Record<InterviewBuddyOutputKey, string>

type InterviewCoachMeta = {
  evidenceScore: number
  riskFlags: string[]
  missingEvidence: string[]
  followUpDrills: string[]
  boundaryNote: string
  source: "ai" | "local"
}

type ReusableAnswerKey = keyof ReusableAnswers

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

const analyticsServiceBaseUrl =
  process.env.NEXT_PUBLIC_ANALYTICS_URL ?? "/analytics"
const storageKey = "autotime-v2-companion-dashboard"
const productContextStorageKey = "autotime-v2-product-context"
const trustStateStorageKey = "autotime-v2-trust-state"
const syncPreferenceStorageKey = "autotime-v2-sync-preferences"
const walkthroughStorageKey = "autotime-v2-first-login-walkthrough-seen"
const profileExecutionThreshold = PROFILE_EXECUTION_THRESHOLD

function getUserScopedStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`
}

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

const interviewQuestionOptions = [
  "Tell me about yourself.",
  "Why are you interested in this role?",
  "What is your strongest relevant experience?",
  "Tell me about a difficult stakeholder situation.",
  "Describe a project where you improved a process or system.",
  "What are your strengths?",
  "What is your notice period or availability?",
  "Do you need sponsorship or work authorisation support?"
]

const emptyInterviewBuddyOutputs: InterviewBuddyOutputs = {
  professionalAnswer: "",
  naturalAnswer: "",
  lightFunnyAnswer: "",
  strongFinalAnswer: ""
}

const emptyInterviewCoachMeta: InterviewCoachMeta = {
  evidenceScore: 0,
  riskFlags: [],
  missingEvidence: [],
  followUpDrills: [],
  boundaryNote:
    "AutoTime keeps interview prep evidence-first. Add your real notes, then review before using.",
  source: "local"
}

const dashboardFocusCopy: Record<
  DashboardFocus,
  { eyebrow: string; title: string; body: string }
> = {
  dashboard: {
    eyebrow: "Dashboard",
    title: "Your EU application workspace",
    body: "Track jobs, analyse fit, prepare stronger applications and keep every next action visible."
  },
  "job-inbox": {
    eyebrow: "Tracked Jobs",
    title: "Tracked Jobs",
    body: "Roles captured from the extension or tracked from a fit analysis."
  },
  "match-score": {
    eyebrow: "Analyse Fit",
    title: "Analyse Fit before you apply",
    body: "Rules-first fit check for one role against your saved profile evidence, country context and missing proof."
  },
  "cv-tailor": {
    eyebrow: "Evidence Bank",
    title: "Evidence Bank",
    body: "Keep CV evidence, projects, skills and proof points ready for role-specific positioning."
  },
  "application-answers": {
    eyebrow: "Application Kit",
    title: "Application Kit",
    body: "Prepare profile summaries, cover notes and reusable answers from verified evidence."
  },
  "autofill-profile": {
    eyebrow: "Profile setup",
    title: "Profile Evidence",
    body: "Add the profile details AutoTime needs for fit analysis and application preparation."
  },
  "application-tracker": {
    eyebrow: "Tracked Jobs",
    title: "Tracked Jobs",
    body: "See tracked jobs, update status and keep next steps visible."
  },
  "follow-ups": {
    eyebrow: "Follow-ups",
    title: "Follow-up Queue",
    body: "Deadlines, reminders and next actions across saved applications."
  },
  "interview-prep": {
    eyebrow: "Interview",
    title: "Interview Prep",
    body: "Turn rough notes into clearer interview answers."
  },
  insights: {
    eyebrow: "Progress",
    title: "Progress",
    body: "See what is working across tracked jobs."
  },
  settings: {
    eyebrow: "Settings",
    title: "Settings",
    body: "Account, sync and profile controls."
  }
}

const defaultDashboardFocusByView: Record<
  DashboardTab | "overview",
  DashboardFocus
> = {
  overview: "dashboard",
  profile: "autofill-profile",
  jobs: "match-score",
  applications: "application-tracker",
  interview: "interview-prep"
}

const roleMarkets: Array<{
  id: RoleMarket
  label: string
  description: string
  keywords: string[]
  targetRoles: string
  positioning: string
  detectedReason: string
}> = [
  {
    id: "general-tech",
    label: "General tech",
    description:
      "Product, platform, operations, support, analyst and delivery roles.",
    keywords: [
      "product",
      "platform",
      "operations",
      "support",
      "delivery",
      "systems",
      "business analyst"
    ],
    targetRoles:
      "Business Analyst, Systems Analyst, Product Analyst, Data Analyst, Application Support Analyst",
    positioning:
      "Show product understanding, systems thinking, measurable user impact, tooling fluency and reliable delivery.",
    detectedReason:
      "Detected broad product, platform, systems, support or delivery language."
  },
  {
    id: "fintech",
    label: "FinTech",
    description:
      "Payments, banking, risk, compliance, resilience, operations and regulated systems roles.",
    keywords: [
      "fintech",
      "payments",
      "payment",
      "banking",
      "risk",
      "compliance",
      "kyc",
      "aml",
      "settlement",
      "reconciliation",
      "operational resilience"
    ],
    targetRoles:
      "Business Analyst, Technical Business Analyst, Application Support Analyst, Payments Analyst, Operational Resilience Analyst",
    positioning:
      "Position around payments, financial systems, risk, controls, operational resilience, compliance awareness, stakeholder clarity and reliable delivery.",
    detectedReason:
      "Detected FinTech, payments, banking, risk, compliance or resilience language."
  },
  {
    id: "enterprise-saas",
    label: "Enterprise SaaS",
    description:
      "B2B workflows, CRM, ERP, RevOps, customer success, implementation and platform operations.",
    keywords: [
      "saas",
      "b2b",
      "crm",
      "erp",
      "salesforce",
      "hubspot",
      "revops",
      "implementation",
      "customer success"
    ],
    targetRoles:
      "Business Analyst, Product Analyst, Implementation Analyst, Revenue Operations Analyst, Customer Success Operations Analyst",
    positioning:
      "Lead with workflow clarity, customer-facing systems, adoption, implementation discipline, reporting and cross-functional operating rhythm.",
    detectedReason:
      "Detected B2B SaaS, CRM, implementation, RevOps or customer operations language."
  },
  {
    id: "data-ai",
    label: "Data & AI",
    description:
      "Analytics, machine learning products, data platforms, reporting, governance and AI operations.",
    keywords: [
      "data",
      "analytics",
      "machine learning",
      "ai",
      "llm",
      "model",
      "bi",
      "dashboard",
      "governance",
      "warehouse"
    ],
    targetRoles:
      "Data Analyst, Product Analyst, AI Operations Analyst, Analytics Engineer, Business Intelligence Analyst",
    positioning:
      "Position around data quality, metric definition, analytical storytelling, governance, model limitations and decision support.",
    detectedReason:
      "Detected data, analytics, AI, BI, model or governance language."
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    description:
      "Security operations, risk, IAM, compliance, incident response, vulnerability and trust workflows.",
    keywords: [
      "security",
      "cyber",
      "iam",
      "identity",
      "soc",
      "incident",
      "vulnerability",
      "iso 27001",
      "soc 2",
      "gdpr"
    ],
    targetRoles:
      "Security Analyst, GRC Analyst, IAM Analyst, Security Operations Analyst, Risk Analyst",
    positioning:
      "Lead with risk thinking, evidence handling, controls, incident discipline, stakeholder clarity and privacy-aware delivery.",
    detectedReason:
      "Detected security, IAM, compliance, incident, privacy or risk-control language."
  },
  {
    id: "healthtech",
    label: "HealthTech",
    description:
      "Digital health, patient workflows, NHS/EU healthcare systems, clinical operations and regulated data.",
    keywords: [
      "health",
      "healthcare",
      "clinical",
      "patient",
      "nhs",
      "ehr",
      "emr",
      "medical",
      "care pathway"
    ],
    targetRoles:
      "Healthcare Business Analyst, Product Analyst, Clinical Systems Analyst, Implementation Analyst",
    positioning:
      "Position around patient workflow safety, data sensitivity, regulated delivery, stakeholder empathy and operational adoption.",
    detectedReason:
      "Detected healthcare, clinical, patient workflow or regulated health-system language."
  },
  {
    id: "climate-energy",
    label: "Climate & Energy",
    description:
      "CleanTech, energy platforms, carbon data, grid, sustainability, climate reporting and infrastructure.",
    keywords: [
      "climate",
      "energy",
      "cleantech",
      "carbon",
      "sustainability",
      "grid",
      "renewable",
      "emissions",
      "esg"
    ],
    targetRoles:
      "Product Analyst, Sustainability Data Analyst, Energy Systems Analyst, Climate Operations Analyst",
    positioning:
      "Lead with systems thinking, data quality, regulatory awareness, stakeholder coordination and mission-aligned delivery.",
    detectedReason:
      "Detected climate, energy, carbon, sustainability, grid or ESG language."
  },
  {
    id: "gov-public",
    label: "GovTech & Public Sector",
    description:
      "Public services, procurement, citizen workflows, accessibility, compliance and service transformation.",
    keywords: [
      "government",
      "public sector",
      "govtech",
      "citizen",
      "procurement",
      "accessibility",
      "gds",
      "service design"
    ],
    targetRoles:
      "Business Analyst, Service Designer, Digital Transformation Analyst, Product Analyst",
    positioning:
      "Position around user needs, accessibility, policy constraints, procurement reality, evidence and service outcomes.",
    detectedReason:
      "Detected government, public-sector, service design, accessibility or procurement language."
  },
  {
    id: "ecommerce-marketplace",
    label: "Ecommerce & Marketplaces",
    description:
      "Retail platforms, marketplace operations, payments, logistics, growth, conversion and customer journeys.",
    keywords: [
      "ecommerce",
      "e-commerce",
      "marketplace",
      "retail",
      "checkout",
      "logistics",
      "conversion",
      "growth",
      "merchant"
    ],
    targetRoles:
      "Product Analyst, Marketplace Operations Analyst, Ecommerce Business Analyst, Growth Analyst",
    positioning:
      "Lead with customer journey, funnel metrics, checkout/payment reliability, marketplace operations and commercial impact.",
    detectedReason:
      "Detected ecommerce, marketplace, retail, logistics, conversion or growth language."
  },
  {
    id: "devtools-cloud",
    label: "DevTools & Cloud",
    description:
      "Developer platforms, cloud infrastructure, APIs, observability, platform engineering and technical workflows.",
    keywords: [
      "developer",
      "devtools",
      "cloud",
      "api",
      "infrastructure",
      "kubernetes",
      "observability",
      "platform engineering",
      "ci/cd"
    ],
    targetRoles:
      "Technical Business Analyst, Platform Analyst, Developer Experience Analyst, API Product Analyst",
    positioning:
      "Position around technical fluency, API/platform understanding, documentation, reliability signals and developer workflow empathy.",
    detectedReason:
      "Detected developer tooling, cloud, API, infrastructure, observability or platform-engineering language."
  }
]

const candidatePositions: Array<{
  id: CandidateMarketPosition
  label: string
  description: string
}> = [
  {
    id: "foreign-candidate",
    label: "Foreign / relocating",
    description:
      "Clarifies work rights, sponsorship, relocation, country fit and practical application risk."
  },
  {
    id: "native-candidate",
    label: "Native / local",
    description:
      "Focuses on role fit, salary range, notice period, local credibility and interview conversion."
  }
]

const urgencyOptions: Array<{ id: CandidateUrgency; label: string }> = [
  { id: "urgent", label: "Urgent" },
  { id: "active", label: "Active" },
  { id: "exploring", label: "Exploring" }
]

const experienceLevelOptions = [
  "Entry-level",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead"
]

const euCountryOptions = [
  "United Kingdom",
  "Ireland",
  "Netherlands",
  "Germany",
  "France",
  "Spain",
  "Portugal",
  "Sweden",
  "Denmark",
  "Norway",
  "Finland",
  "Poland",
  "Belgium",
  "Austria",
  "Switzerland"
]

const officialSourceFallback: OfficialSource[] = [
  {
    label: "EU immigration portal",
    url: "https://immigration-portal.ec.europa.eu/index_en",
    note: "Use this as a starting point, then verify the hiring country directly."
  }
]

const officialCountrySources: Record<string, OfficialSource[]> = {
  "United Kingdom": [
    {
      label: "GOV.UK Skilled Worker visa",
      url: "https://www.gov.uk/skilled-worker-visa",
      note: "Verify job, salary, sponsor and document requirements."
    },
    {
      label: "GOV.UK sponsor licence guidance",
      url: "https://www.gov.uk/uk-visa-sponsorship-employers",
      note: "Check employer sponsorship responsibilities and limits."
    }
  ],
  Ireland: [
    {
      label: "Ireland Critical Skills Employment Permit",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/",
      note: "Verify eligibility, remuneration and permit requirements."
    },
    {
      label: "Ireland employment permit types",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/",
      note: "Compare permit routes before assuming a role is viable."
    }
  ],
  Germany: [
    {
      label: "Make it in Germany work visa",
      url: "https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals",
      note: "Verify qualification, job offer and work visa requirements."
    },
    {
      label: "Make it in Germany visa procedure",
      url: "https://www.make-it-in-germany.com/en/visa-residence/procedure/entry-process",
      note: "Check the visa process and required verification steps."
    }
  ],
  Netherlands: [
    {
      label: "IND highly skilled migrant",
      url: "https://ind.nl/en/residence-permits/work/highly-skilled-migrant",
      note: "Verify recognised sponsor, contract and income requirements."
    },
    {
      label: "IND recognised sponsor background",
      url: "https://ind.nl/en/about-us/background-articles/national-highly-skilled-migrant-scheme",
      note: "Understand recognised sponsor obligations and register context."
    }
  ],
  France: [
    {
      label: "France-Visas salaried employment",
      url: "https://www.france-visas.gouv.fr/en/salaried-employment",
      note: "Verify work permit and visa route requirements."
    },
    {
      label: "Service-Public work authorisation",
      url: "https://www.service-public.fr/particuliers/vosdroits/F2728",
      note: "Check when work authorisation is required in France."
    }
  ]
}

const defaultProductContext: ProductContext = {
  roleMarket: "general-tech",
  candidatePosition: "foreign-candidate",
  urgency: "active",
  targetCountry: "United Kingdom",
  experienceLevel: "Mid-level"
}

const defaultTrustState: TrustState = {
  officialSourceReviewed: false,
  officialSourceReviewedAt: ""
}

const productContextSchema = z.object({
  roleMarket: z
    .enum(
      roleMarkets.map((market) => market.id) as [RoleMarket, ...RoleMarket[]]
    )
    .optional(),
  candidatePosition: z
    .enum(
      candidatePositions.map((position) => position.id) as [
        CandidateMarketPosition,
        ...CandidateMarketPosition[]
      ]
    )
    .optional(),
  urgency: z
    .enum(
      urgencyOptions.map((option) => option.id) as [
        CandidateUrgency,
        ...CandidateUrgency[]
      ]
    )
    .optional(),
  targetCountry: z.string().trim().min(1).optional(),
  experienceLevel: z.string().trim().min(1).optional()
})

const trustStateSchema = z.object({
  officialSourceReviewed: z.boolean().optional(),
  officialSourceReviewedAt: z.string().optional()
})

const defaultSyncPreferences: SyncPreferences = {
  profileAccountSyncEnabled: false
}

const syncPreferencesSchema = z.object({
  profileAccountSyncEnabled: z.boolean().optional()
})

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "",
  targetCountries: "",
  targetRoles: "",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: "",
  projectSummaries: "",
  experienceHighlights: ""
}

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "",
  salaryExpectationAnswer: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

const emptyJobAnalysis: JobAnalysisDraft = {
  jobTitle: "",
  company: "",
  jobUrl: "",
  location: "",
  workMode: "unknown",
  jobDescription: "",
  notes: "",
  skills: [],
  seniority: "",
  summary: "",
  gaps: [],
  fitScore: 0,
  positioningAngle: "",
  scoreFactors: []
}

const defaultState: CompanionDashboardState = {
  profile: emptyProfile,
  reusableAnswers: emptyReusableAnswers,
  jobAnalysis: emptyJobAnalysis,
  applications: [],
  interviewPrepPacks: [],
  evidenceRecords: [],
  outcomeRecords: []
}

function isLegacySampleState(state: CompanionDashboardState) {
  return (
    state.applications.length === 0 &&
    state.jobAnalysis.company === "Example FinTech" &&
    state.jobAnalysis.jobUrl ===
      "https://example.com/jobs/business-systems-analyst"
  )
}

function normalizeLegacyDashboardState(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value
  }

  const record = value as Record<string, unknown>
  const normalizeStatus = (status: unknown) =>
    status === "Applying"
      ? "Ready to apply"
      : status === "Closed"
        ? "Archived"
        : status
  const normalizeItems = (items: unknown) =>
    Array.isArray(items)
      ? items.map((item) =>
          typeof item === "object" && item !== null
            ? {
                ...item,
                status: normalizeStatus(
                  (item as Record<string, unknown>).status
                )
              }
            : item
        )
      : items

  return {
    ...record,
    applications: normalizeItems(record.applications),
    outcomeRecords: normalizeItems(record.outcomeRecords)
  }
}

function getStoredState(userId: string) {
  if (typeof window === "undefined") {
    return defaultState
  }

  try {
    const parsed = normalizeLegacyDashboardState(
      JSON.parse(
        window.localStorage.getItem(
          getUserScopedStorageKey(storageKey, userId)
        ) ?? "null"
      )
    )
    const result = companionDashboardStateSchema.safeParse(parsed)
    return result.success && !isLegacySampleState(result.data)
      ? {
          ...defaultState,
          ...result.data,
          evidenceRecords: result.data.evidenceRecords ?? [],
          outcomeRecords: result.data.outcomeRecords ?? []
        }
      : defaultState
  } catch {
    return defaultState
  }
}

function saveState(state: CompanionDashboardState, userId: string) {
  window.localStorage.setItem(
    getUserScopedStorageKey(storageKey, userId),
    JSON.stringify(state)
  )
  window.dispatchEvent(new Event(profileProtocolReadinessEvent))
}

function getStoredProductContext(userId: string) {
  if (typeof window === "undefined") {
    return defaultProductContext
  }

  try {
    const parsed = productContextSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(
          getUserScopedStorageKey(productContextStorageKey, userId)
        ) ?? "null"
      )
    )

    return parsed.success
      ? {
          ...defaultProductContext,
          ...parsed.data
        }
      : defaultProductContext
  } catch {
    return defaultProductContext
  }
}

function saveProductContext(context: ProductContext, userId: string) {
  window.localStorage.setItem(
    getUserScopedStorageKey(productContextStorageKey, userId),
    JSON.stringify(context)
  )
}

function getStoredTrustState(userId: string): TrustState {
  if (typeof window === "undefined") {
    return defaultTrustState
  }

  try {
    const parsed = trustStateSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(
          getUserScopedStorageKey(trustStateStorageKey, userId)
        ) ?? "null"
      )
    )

    return parsed.success
      ? {
          ...defaultTrustState,
          ...parsed.data
        }
      : defaultTrustState
  } catch {
    return defaultTrustState
  }
}

function saveTrustState(state: TrustState, userId: string) {
  window.localStorage.setItem(
    getUserScopedStorageKey(trustStateStorageKey, userId),
    JSON.stringify(state)
  )
}

function getStoredSyncPreferences(userId: string): SyncPreferences {
  if (typeof window === "undefined") {
    return defaultSyncPreferences
  }

  try {
    const parsed = syncPreferencesSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(
          getUserScopedStorageKey(syncPreferenceStorageKey, userId)
        ) ?? "null"
      )
    )

    return parsed.success
      ? {
          ...defaultSyncPreferences,
          ...parsed.data
        }
      : defaultSyncPreferences
  } catch {
    return defaultSyncPreferences
  }
}

function saveSyncPreferences(preferences: SyncPreferences, userId: string) {
  window.localStorage.setItem(
    getUserScopedStorageKey(syncPreferenceStorageKey, userId),
    JSON.stringify(preferences)
  )
}

function getWordSignals(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(
          /\b(requirements?|stakeholders?|uat|payments?|fintech|sql|api|agile|support|systems?|reporting|delivery|analysis)\b/g
        ) ?? []
    )
  )
}

function normaliseSentence(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim()

  if (!trimmed) {
    return ""
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function getMeaningfulTokens(value: string) {
  return value.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []
}

function hasLikelyKeyboardNoise(value: string) {
  const compact = value.toLowerCase().replace(/[^a-z]/g, "")

  if (!compact) {
    return true
  }

  const uniqueLetters = new Set(compact).size
  const vowelCount = compact.match(/[aeiou]/g)?.length ?? 0
  const vowelRatio = vowelCount / compact.length
  const repeatedRuns = /(.)\1{2,}/.test(compact)

  return (
    compact.length < 8 ||
    uniqueLetters <= 3 ||
    vowelRatio < 0.18 ||
    repeatedRuns
  )
}

function validateInterviewBuddyInput({
  draft,
  question
}: {
  draft: string
  question: string
}): string | null {
  const cleanQuestion = question.trim()
  const cleanDraft = draft.trim()
  const questionTokens = getMeaningfulTokens(cleanQuestion)
  const draftTokens = getMeaningfulTokens(cleanDraft)

  if (cleanQuestion.length < 12 || questionTokens.length < 3) {
    return "Please enter a real interview question before generating answers."
  }

  if (hasLikelyKeyboardNoise(cleanQuestion)) {
    return "The question looks like random text. Add a clear interview question."
  }

  if (cleanDraft.length < 30 || draftTokens.length < 6) {
    return "Please add a rough but meaningful answer with at least one real example, skill, or situation."
  }

  if (hasLikelyKeyboardNoise(cleanDraft)) {
    return "The draft looks like random text. Add honest notes about what you did, learned, or achieved."
  }

  return null
}

function getProfileContextForInterview(profile: CandidateProfile) {
  return [
    profile.targetRoles && `Target roles: ${profile.targetRoles}`,
    profile.targetCountries && `Target countries: ${profile.targetCountries}`,
    profile.currentCountry && `Current country: ${profile.currentCountry}`,
    profile.experienceHighlights &&
      `Experience evidence: ${profile.experienceHighlights}`,
    profile.projectSummaries && `Project evidence: ${profile.projectSummaries}`,
    profile.baseCvText && `CV evidence: ${profile.baseCvText.slice(0, 420)}`
  ]
    .filter(Boolean)
    .join(" ")
}

function isImmigrationRelatedQuestion(question: string) {
  return /\b(visa|immigration|sponsor|sponsorship|work permit|right to work|work authori[sz]ation|settled status|pre-settled|skilled worker)\b/i.test(
    question
  )
}

function getInterviewBuddyDisclaimer(question: string) {
  return isImmigrationRelatedQuestion(question)
    ? "General career preparation only; check official sources or a qualified adviser for immigration decisions."
    : ""
}

function inferReusableAnswerKey(question: string): ReusableAnswerKey {
  if (/\b(sponsor|sponsorship|visa|work permit)\b/i.test(question)) {
    return "sponsorshipAnswer"
  }

  if (/\b(work authori[sz]ation|right to work|work rights)\b/i.test(question)) {
    return "workAuthorisationAnswer"
  }

  if (/\b(relocat|move country|move to)\b/i.test(question)) {
    return "relocationAnswer"
  }

  if (/\b(notice)\b/i.test(question)) {
    return "noticePeriodAnswer"
  }

  if (/\b(availab|start date)\b/i.test(question)) {
    return "availabilityAnswer"
  }

  if (/\b(strength|strongest|best at)\b/i.test(question)) {
    return "strengthsAnswer"
  }

  return "motivationAnswer"
}

function getReusableAnswerLabel(key: ReusableAnswerKey) {
  const labels: Record<ReusableAnswerKey, string> = {
    sponsorshipAnswer: "sponsorship answer",
    relocationAnswer: "relocation answer",
    workAuthorisationAnswer: "work authorisation answer",
    noticePeriodAnswer: "notice period answer",
    salaryExpectationAnswer: "salary expectation answer",
    motivationAnswer: "motivation answer",
    strengthsAnswer: "strengths answer",
    availabilityAnswer: "availability answer"
  }

  return labels[key]
}

function createInterviewBuddyOutputs({
  draft,
  profile,
  question
}: {
  draft: string
  profile: CandidateProfile
  question: string
}): InterviewBuddyOutputs {
  const cleanQuestion = question.trim()
  const cleanDraft = normaliseSentence(draft)
  const validationError = validateInterviewBuddyInput({
    draft,
    question
  })
  const profileContext = getProfileContextForInterview(profile)
  const evidenceLine = profileContext
    ? `I would connect that to my profile evidence: ${normaliseSentence(profileContext)}`
    : "I would keep the answer limited to the experience I can clearly evidence."
  const limitLine =
    "I would avoid adding claims that are not already in my draft or saved profile."

  if (validationError || !cleanDraft) {
    return emptyInterviewBuddyOutputs
  }

  return {
    professionalAnswer: [
      `For "${cleanQuestion}", I would answer: ${cleanDraft}`,
      evidenceLine,
      limitLine
    ].join(" "),
    naturalAnswer: [
      cleanDraft,
      "The simple version is that I can explain what I did, what changed, and where I still need to be precise.",
      "I would keep it conversational and stay within what I can prove."
    ].join(" "),
    lightFunnyAnswer: [
      cleanDraft,
      "In plain terms, I try to be the person who turns messy work into something the team can actually use.",
      "That is the light version, but I would still keep the interview answer factual."
    ].join(" "),
    strongFinalAnswer: [
      `My answer to "${cleanQuestion}" would be: ${cleanDraft}`,
      evidenceLine,
      "The outcome I would emphasise is clearer delivery, better stakeholder confidence, and a practical next step.",
      limitLine
    ].join(" ")
  }
}

function createLocalInterviewCoachMeta({
  draft,
  profile,
  question
}: {
  draft: string
  profile: CandidateProfile
  question: string
}): InterviewCoachMeta {
  const missingEvidence = [
    !profile.experienceHighlights.trim() && "Add experience highlights",
    !profile.projectSummaries.trim() && "Add one project or delivery example",
    !profile.workRightDetails.trim() && "Add verified work-right details",
    !draft.match(
      /\b(result|impact|improved|reduced|increased|delivered|saved|launched)\b/i
    ) && "Add a concrete outcome or result"
  ].filter(Boolean) as string[]
  const riskFlags = [
    isImmigrationRelatedQuestion(question) &&
      "Work-right answer needs official-source verification",
    draft.match(/\b(always|guarantee|expert in everything|perfect)\b/i) &&
      "Avoid overclaiming; keep the answer credible"
  ].filter(Boolean) as string[]

  return {
    evidenceScore: Math.max(
      25,
      90 - missingEvidence.length * 15 - riskFlags.length * 10
    ),
    riskFlags,
    missingEvidence,
    followUpDrills: [
      "Prepare one measurable result you can explain in under 30 seconds.",
      "Prepare one trade-off or mistake and what you changed afterwards.",
      "Prepare the honest boundary: what you know, what you would verify, and what you would not claim."
    ],
    boundaryNote:
      getInterviewBuddyDisclaimer(question) ||
      "Use this as preparation, not a script. Keep the final answer truthful and editable.",
    source: "local"
  }
}

function getFitScore(profile: CandidateProfile, job: JobAnalysisDraft) {
  const profileSignals = getWordSignals(
    [profile.baseCvText, profile.experienceHighlights, profile.projectSummaries]
      .join(" ")
      .toLowerCase()
  )
  const jobSignals = getWordSignals(
    [job.jobTitle, job.jobDescription, job.notes].join(" ").toLowerCase()
  )

  if (jobSignals.length === 0) {
    return job.fitScore ?? 0
  }

  const matched = jobSignals.filter((signal) => profileSignals.includes(signal))
  return Math.max(
    job.fitScore ?? 0,
    Math.round((matched.length / jobSignals.length) * 100)
  )
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

function scoreTextEvidence(text: string, strongLength: number) {
  const length = text.trim().length

  if (length >= strongLength) {
    return 100
  }

  if (length >= strongLength / 2) {
    return 70
  }

  if (length >= 40) {
    return 45
  }

  return 15
}

function getSignalStatus(score: number): ProfileQualitySignal["status"] {
  if (score >= 75) {
    return "ready"
  }

  if (score >= 45) {
    return "needs-check"
  }

  return "blocked"
}

function getProfileQualitySignals(
  profile: CandidateProfile,
  reusableAnswers: ReusableAnswers
): ProfileQualitySignal[] {
  const evidenceScore = Math.round(
    (scoreTextEvidence(profile.baseCvText, 1200) +
      scoreTextEvidence(profile.experienceHighlights, 500) +
      scoreTextEvidence(profile.projectSummaries, 500)) /
      3
  )
  const workRightScore = profile.workRightDetails.trim()
    ? profile.sponsorshipNeeded
      ? 70
      : 90
    : 15
  const roleFocusScore =
    profile.targetRoles.trim() && profile.targetCountries.trim()
      ? 90
      : profile.targetRoles.trim() || profile.targetCountries.trim()
        ? 55
        : 20
  const cvFactsScore = profile.baseCvText.trim()
    ? scoreTextEvidence(profile.baseCvText, 1000)
    : 10
  const allowedClaimInputs = [
    profile.baseCvText,
    profile.experienceHighlights,
    profile.projectSummaries,
    reusableAnswers.strengthsAnswer,
    reusableAnswers.workAuthorisationAnswer
  ].filter((value) => value.trim().length > 60).length
  const claimBoundaryScore = Math.min(100, allowedClaimInputs * 22)

  return [
    {
      detail:
        evidenceScore >= 75
          ? "Enough profile evidence for grounded job checks."
          : "Add CV text, project summaries and experience highlights.",
      label: "Evidence strength",
      score: evidenceScore,
      status: getSignalStatus(evidenceScore)
    },
    {
      detail:
        workRightScore >= 75
          ? "Work-right context is available for EU checks."
          : "Add only verified work-right, sponsorship and relocation facts.",
      label: "Work-right readiness",
      score: workRightScore,
      status: getSignalStatus(workRightScore)
    },
    {
      detail:
        roleFocusScore >= 75
          ? "Target roles and countries are clear."
          : "Add target role families and countries before checking roles.",
      label: "Role focus clarity",
      score: roleFocusScore,
      status: getSignalStatus(roleFocusScore)
    },
    {
      detail:
        cvFactsScore >= 75
          ? "CV facts are available for fit and interview evidence."
          : "Paste enough factual CV content to support recommendations.",
      label: "CV facts available",
      score: cvFactsScore,
      status: getSignalStatus(cvFactsScore)
    },
    {
      detail:
        claimBoundaryScore >= 75
          ? "AI can use saved claims with clearer boundaries."
          : "AutoTime will avoid unsupported claims until more evidence exists.",
      label: "Allowed AI claims",
      score: claimBoundaryScore,
      status: getSignalStatus(claimBoundaryScore)
    }
  ]
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

function createApplication(
  job: JobAnalysisDraft,
  fitEvaluation: CountryFitEvaluation
): ApplicationRecord {
  const title = job.jobTitle || "Untitled role"
  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: title,
    company: job.company || undefined,
    url: job.jobUrl || "Manual dashboard entry",
    source: getHostname(job.jobUrl),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "Saved",
    nextAction: fitEvaluation.nextBestAction,
    nextActionDate: "",
    outcomeReason: "Unknown",
    notes: [
      fitEvaluation.decision,
      fitEvaluation.positioningAngle,
      job.positioningAngle || job.notes,
      fitEvaluation.learningPrompt
    ]
      .filter(Boolean)
      .join(" "),
    fitScore: fitEvaluation.overallScore,
    fitDecision: fitEvaluation.decision,
    contentGate: fitEvaluation.contentGate
  }
}

function createApplicationContentSnapshot({
  application,
  job,
  profile,
  reusableAnswers
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  profile: CandidateProfile
  reusableAnswers: ReusableAnswers
}): ApplicationContentSnapshot {
  const role = application.roleTitle || application.title || "this role"
  const company = application.company || "the company"
  const targetRoles = profile.targetRoles || "relevant technology roles"
  const profileEvidence =
    profile.experienceHighlights ||
    profile.projectSummaries ||
    profile.baseCvText.slice(0, 420)
  const positioning =
    job.positioningAngle ||
    application.fitDecision ||
    "evidence-led fit, role understanding and clear next steps"
  const workRight =
    reusableAnswers.workAuthorisationAnswer ||
    profile.workRightDetails ||
    "Add your verified work-right wording before using this answer."
  const motivation =
    reusableAnswers.motivationAnswer ||
    `I am interested in ${role} at ${company} because the role connects with my target focus in ${targetRoles}.`
  const strengths =
    reusableAnswers.strengthsAnswer ||
    (profileEvidence
      ? `My strongest relevant evidence is: ${profileEvidence}`
      : "Add a specific project, outcome or responsibility from your evidence profile before using this answer.")
  const availability =
    reusableAnswers.availabilityAnswer ||
    profile.noticePeriod ||
    "Add your verified notice period or availability before using this answer."

  return {
    availabilityAnswer: availability,
    coverLetter: [
      `Dear ${company} team,`,
      "",
      `I am applying for ${role}. My fit is strongest where the role needs ${positioning}.`,
      "",
      strengths,
      "",
      `Work-right context: ${workRight}`,
      "",
      "I would welcome the chance to discuss how this evidence maps to the role requirements."
    ].join("\n"),
    motivationAnswer: motivation,
    profileSummary:
      profileEvidence ||
      "Add profile evidence first, then regenerate this summary from verified facts.",
    savedAt: new Date().toISOString(),
    strengthsAnswer: strengths
  }
}

function createEvidenceRecords({
  application,
  fitEvaluation,
  profile
}: {
  application: ApplicationRecord
  fitEvaluation: CountryFitEvaluation
  profile: CandidateProfile
}): EvidenceRecord[] {
  const now = new Date().toISOString()
  const componentRecords = fitEvaluation.components.map((component) => ({
    id: crypto.randomUUID(),
    applicationId: application.id,
    jobUrl: application.url,
    checkKey: component.key,
    checkLabel: component.label,
    status:
      component.status === "blocker"
        ? "risk"
        : component.evidence.length
          ? "found"
          : "missing",
    evidenceText: component.evidence.join(" ") || "No direct evidence found.",
    sourceType: component.evidence.length ? "job_text" : "system_rule",
    sourceLabel: component.evidence.length
      ? "Saved profile and job text"
      : "AutoTime rule check",
    missingInput: component.evidence.length ? undefined : component.label,
    riskFlag: component.status === "blocker" ? component.rationale : undefined,
    explanation: component.rationale,
    limit:
      "This evidence record is based on saved profile, job text and local decision rules only.",
    createdAt: now
  })) satisfies EvidenceRecord[]

  const profileEvidence: EvidenceRecord[] = [
    {
      id: crypto.randomUUID(),
      applicationId: application.id,
      jobUrl: application.url,
      checkKey: "profile-work-right",
      checkLabel: "Work-right evidence",
      status: profile.workRightDetails.trim() ? "found" : "missing",
      evidenceText:
        profile.workRightDetails.trim() || "Work-right evidence is missing.",
      sourceType: "profile",
      sourceLabel: "Saved candidate profile",
      missingInput: profile.workRightDetails.trim()
        ? undefined
        : "work-right details",
      explanation:
        "Work-right evidence is required before application advice can be treated as strong.",
      limit:
        "AutoTime does not authorise employment, visa, immigration or sponsorship status.",
      createdAt: now
    },
    {
      id: crypto.randomUUID(),
      applicationId: application.id,
      jobUrl: application.url,
      checkKey: "profile-cv",
      checkLabel: "CV evidence",
      status: profile.baseCvText.trim() ? "found" : "missing",
      evidenceText: profile.baseCvText.trim()
        ? profile.baseCvText.trim().slice(0, 600)
        : "CV evidence is missing.",
      sourceType: "cv",
      sourceLabel: "Saved CV text",
      missingInput: profile.baseCvText.trim() ? undefined : "CV evidence",
      explanation:
        "CV evidence is used to avoid inventing experience or unsupported application claims.",
      limit:
        "Only user-saved CV text is used; AutoTime cannot verify facts outside the provided evidence.",
      createdAt: now
    }
  ]

  const blockerRecords = fitEvaluation.blockers.map((blocker) => ({
    id: crypto.randomUUID(),
    applicationId: application.id,
    jobUrl: application.url,
    checkKey: "decision-blocker",
    checkLabel: "Decision blocker",
    status: "risk",
    evidenceText: blocker,
    sourceType: "system_rule",
    sourceLabel: "AutoTime decision rule",
    riskFlag: blocker,
    explanation: blocker,
    limit:
      "A blocker is a risk signal, not an official employer, immigration or legal decision.",
    createdAt: now
  })) satisfies EvidenceRecord[]

  return [...componentRecords, ...profileEvidence, ...blockerRecords]
}

function createOutcomeRecord(application: ApplicationRecord): OutcomeRecord {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    applicationId: application.id,
    roleTitle: application.roleTitle || application.title,
    company: application.company,
    source: application.source,
    status: application.status,
    outcomeReason: application.outcomeReason ?? "Unknown",
    decisionIndexAtSave: application.fitScore,
    decisionLabelAtSave: application.fitDecision,
    contentGateAtSave: application.contentGate,
    appliedAt: application.status === "Applied" ? now : undefined,
    interviewAt: application.status === "Interview" ? now : undefined,
    closedAt:
      application.status === "Rejected" || application.status === "Archived"
        ? now
        : undefined,
    notes: application.notes,
    createdAt: now,
    updatedAt: now
  }
}

function updateOutcomeRecordFromApplication(
  existing: OutcomeRecord | undefined,
  application: ApplicationRecord
): OutcomeRecord {
  const now = new Date().toISOString()
  const base = existing ?? createOutcomeRecord(application)

  return {
    ...base,
    roleTitle: application.roleTitle || application.title,
    company: application.company,
    source: application.source,
    status: application.status,
    outcomeReason: application.outcomeReason ?? "Unknown",
    decisionIndexAtSave: base.decisionIndexAtSave ?? application.fitScore,
    decisionLabelAtSave: base.decisionLabelAtSave ?? application.fitDecision,
    contentGateAtSave: base.contentGateAtSave ?? application.contentGate,
    appliedAt:
      base.appliedAt ?? (application.status === "Applied" ? now : undefined),
    interviewAt:
      base.interviewAt ??
      (application.status === "Interview" ? now : undefined),
    closedAt:
      base.closedAt ??
      (application.status === "Rejected" || application.status === "Archived"
        ? now
        : undefined),
    notes: application.notes,
    updatedAt: now
  }
}

function getOutcomeLearningSignals(
  applications: ApplicationRecord[]
): OutcomeLearningSignals {
  return applications.reduce(
    (signals, application) => {
      const reason = application.outcomeReason ?? "Unknown"

      return {
        totalTracked:
          reason === "Unknown"
            ? signals.totalTracked
            : signals.totalTracked + 1,
        interviews:
          application.status === "Interview" || reason === "Interview secured"
            ? signals.interviews + 1
            : signals.interviews,
        sponsorshipBlocks:
          reason === "Sponsorship blocker"
            ? signals.sponsorshipBlocks + 1
            : signals.sponsorshipBlocks,
        workRightBlocks:
          reason === "Work-right blocker"
            ? signals.workRightBlocks + 1
            : signals.workRightBlocks,
        noResponses:
          reason === "No response"
            ? signals.noResponses + 1
            : signals.noResponses,
        positiveOutcomes:
          reason === "Interview secured" || reason === "Offer or final stage"
            ? signals.positiveOutcomes + 1
            : signals.positiveOutcomes
      }
    },
    {
      totalTracked: 0,
      interviews: 0,
      sponsorshipBlocks: 0,
      workRightBlocks: 0,
      noResponses: 0,
      positiveOutcomes: 0
    }
  )
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

function getReadinessScore(state: CompanionDashboardState) {
  const requiredProfileSignals = [
    state.profile.fullName.trim(),
    state.profile.currentCountry.trim(),
    state.profile.targetCountries.trim(),
    state.profile.targetRoles.trim(),
    state.profile.workRightDetails.trim(),
    state.profile.baseCvText.trim()
  ]
  const reusableSignals = [
    state.reusableAnswers.motivationAnswer.trim(),
    state.reusableAnswers.strengthsAnswer.trim()
  ]
  const requiredCompleted = requiredProfileSignals.filter(Boolean).length
  const reusableCompleted = reusableSignals.filter(Boolean).length

  return Math.min(
    100,
    Math.round(
      (requiredCompleted / requiredProfileSignals.length) * 90 +
        (reusableCompleted / reusableSignals.length) * 10
    )
  )
}

function getNextActionCount(applications: ApplicationRecord[]) {
  return applications.filter(
    (application) =>
      application.status !== "Archived" &&
      application.status !== "Rejected" &&
      (application.nextAction?.trim() || application.status === "Saved")
  ).length
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

function getMetricTone(value: number, goodAt: number): MetricTone {
  if (value >= goodAt) {
    return "good"
  }

  if (value > 0) {
    return "neutral"
  }

  return "warn"
}

function getMarketLabel(context: ProductContext) {
  return roleMarkets.find((market) => market.id === context.roleMarket)?.label
}

function getRoleMarket(context: Pick<ProductContext, "roleMarket">) {
  return (
    roleMarkets.find((market) => market.id === context.roleMarket) ??
    roleMarkets[0]
  )
}

function getCountryGuidance(context: ProductContext) {
  const country = context.targetCountry || "selected country"

  if (context.candidatePosition === "foreign-candidate") {
    return `${country} requirements: work-right, sponsorship, relocation, location fit, missing evidence.`
  }

  return `${country} requirements: availability, salary, notice period, role fit, missing evidence.`
}

function getMarketPositioning(context: ProductContext) {
  return getRoleMarket(context).positioning
}

function getUrgencyGuidance(context: ProductContext) {
  if (context.urgency === "urgent") {
    return "Prioritise roles with strong fit, clear work-right path and fast application execution. Avoid low-fit speculative applications."
  }

  if (context.urgency === "exploring") {
    return "Compare countries, learn role language and strengthen your profile before applying heavily."
  }

  return "Balance targeted applications with quality. Track next actions and improve positioning after each outcome."
}

function includesAny(value: string, words: string[]) {
  const text = value.toLowerCase()
  return words.some((word) => text.includes(word.toLowerCase()))
}

function inferRoleMarketFromText(value: string, fallback: RoleMarket) {
  const ranked = roleMarkets
    .map((market) => ({
      market,
      score: market.keywords.filter((keyword) =>
        value.toLowerCase().includes(keyword.toLowerCase())
      ).length
    }))
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.score
    ? ranked[0].market
    : getRoleMarket({ roleMarket: fallback })
}

function findSupportedCountryInText(value: string) {
  const normalized = value.toLowerCase()
  const countryAliases: Record<string, string[]> = {
    "United Kingdom": [
      "united kingdom",
      "uk",
      "u.k.",
      "england",
      "scotland",
      "wales"
    ]
  }

  return (
    euCountryOptions.find((country) => {
      const aliases = countryAliases[country] ?? [country]

      return aliases.some((alias) =>
        new RegExp(
          `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i"
        ).test(normalized)
      )
    }) || ""
  )
}

function inferTargetCountryFromResume(
  resumeText: string,
  fallbackCountry: string
) {
  const lines = resumeText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const targetLine = lines.find(
    (line) =>
      /\b(target|seeking|looking for|open to|relocat|visa|sponsor|authori[sz]ation|work permit)\b/i.test(
        line
      ) && findSupportedCountryInText(line)
  )

  return targetLine
    ? findSupportedCountryInText(targetLine) || fallbackCountry
    : fallbackCountry
}

function inferContextFromResume(
  resumeText: string,
  current: ProductContext
): ContextSuggestion {
  const words = resumeText.trim().split(/\s+/).filter(Boolean)
  const inferredMarket = inferRoleMarketFromText(resumeText, current.roleMarket)
  const roleMarket = inferredMarket.id
  const targetCountry = inferTargetCountryFromResume(
    resumeText,
    current.targetCountry
  )
  const candidatePosition = includesAny(resumeText, [
    "visa",
    "sponsorship",
    "relocation",
    "work permit",
    "student visa",
    "graduate visa",
    "skilled worker"
  ])
    ? "foreign-candidate"
    : current.candidatePosition
  const experienceLevel = includesAny(resumeText, [
    "lead",
    "principal",
    "manager",
    "senior"
  ])
    ? "Senior"
    : includesAny(resumeText, ["graduate", "intern", "junior", "entry level"])
      ? "Junior"
      : current.experienceLevel
  const targetRoles = [
    includesAny(resumeText, ["technical business analyst"]) &&
      "Technical Business Analyst",
    includesAny(resumeText, ["business analyst"]) && "Business Analyst",
    includesAny(resumeText, ["systems analyst"]) && "Systems Analyst",
    includesAny(resumeText, ["product analyst"]) && "Product Analyst",
    includesAny(resumeText, ["data analyst"]) && "Data Analyst",
    includesAny(resumeText, ["application support"]) &&
      "Application Support Analyst"
  ]
    .filter(Boolean)
    .join(", ")

  return {
    ...current,
    roleMarket,
    candidatePosition,
    experienceLevel,
    targetCountry,
    targetRoles: targetRoles || inferredMarket.targetRoles,
    workRightPrompt:
      candidatePosition === "foreign-candidate"
        ? "Confirm visa/work-right status, sponsorship need, relocation timing and eligible countries before applying."
        : "Confirm local work-right status, notice period, salary expectations and availability before applying.",
    confidence:
      words.length > 120 ? "High" : words.length > 50 ? "Medium" : "Low",
    reasons: [
      inferredMarket.detectedReason,
      targetCountry !== current.targetCountry
        ? `Detected target country: ${targetCountry}.`
        : `Target country kept as ${targetCountry}.`,
      candidatePosition === "foreign-candidate"
        ? "Detected visa, sponsorship, work permit or relocation language."
        : "No strong visa or relocation signal was detected; user approval is still required.",
      `Suggested experience level: ${experienceLevel}.`
    ]
  }
}

function getReadableResumeLines(resumeText: string) {
  return resumeText
    .split(/\r?\n|[\u2022*]|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 24)
    .map((line) => (line.length > 240 ? `${line.slice(0, 237)}...` : line))
}

function inferEvidenceFromResume(resumeText: string) {
  const lines = getReadableResumeLines(resumeText)
  const experienceKeywords = [
    "analyst",
    "support",
    "managed",
    "led",
    "delivered",
    "improved",
    "worked",
    "responsible",
    "stakeholder",
    "requirements",
    "operations",
    "payments",
    "systems"
  ]
  const projectKeywords = [
    "project",
    "migration",
    "implementation",
    "workflow",
    "process",
    "automation",
    "integration",
    "delivery",
    "rollout",
    "improvement",
    "platform",
    "system"
  ]
  const pickLines = (keywords: string[]) =>
    lines
      .filter((line) => includesAny(line, keywords))
      .slice(0, 3)
      .join("\n")

  return {
    experienceHighlights: pickLines(experienceKeywords),
    projectSummaries: pickLines(projectKeywords)
  }
}

function inferCandidateDetailsFromResume(resumeText: string) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const roleTitleKeywords = [
    "analyst",
    "engineer",
    "developer",
    "manager",
    "consultant",
    "specialist",
    "administrator",
    "architect",
    "lead",
    "support",
    "product",
    "project",
    "programme",
    "scrum",
    "agile"
  ]
  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = resumeText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]
  const linkedInUrl = resumeText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0]
  const githubUrl = resumeText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0]
  const portfolioUrl = resumeText.match(
    /https?:\/\/(?![^/\s]*linkedin\.com)(?![^/\s]*github\.com)[^\s)]+/i
  )?.[0]
  const fullName = lines
    .slice(0, 5)
    .find((line) => {
      const words = line.split(" ").filter(Boolean)

      return (
        !includesAny(line, roleTitleKeywords) &&
        !/[0-9@:/\\]/.test(line) &&
        words.length >= 2 &&
        words.length <= 4 &&
        words.every((word) => /^[A-Z][A-Za-z'.-]+$/.test(word))
      )
    })
  const locationLine = lines.find((line) =>
    /\b(location|based in|current city|address)\b/i.test(line)
  )
  const currentCountry = locationLine
    ? findSupportedCountryInText(locationLine)
    : ""
  const currentCity = locationLine
    ?.replace(/\b(location|based in|current city|address)\b\s*:?\s*/i, "")
    .replace(currentCountry, "")
    .split(/,|\|/)[0]
    ?.trim()

  return {
    currentCity: currentCity || "",
    currentCountry,
    email: email ?? "",
    fullName: fullName ?? "",
    githubUrl: githubUrl ?? "",
    linkedInUrl: linkedInUrl ?? "",
    phone: phone?.trim() ?? "",
    portfolioUrl: portfolioUrl ?? ""
  }
}

function normalizeContextSuggestionForApproval({
  fallback,
  suggestion
}: {
  fallback: ContextSuggestion
  suggestion: ContextSuggestion
}): ContextSuggestion {
  const targetCountry = euCountryOptions.includes(suggestion.targetCountry)
    ? suggestion.targetCountry
    : fallback.targetCountry
  const experienceLevel = experienceLevelOptions.includes(
    suggestion.experienceLevel
  )
    ? suggestion.experienceLevel
    : fallback.experienceLevel
  const targetRoles =
    suggestion.targetRoles.trim() || fallback.targetRoles.trim()
  const workRightPrompt =
    suggestion.workRightPrompt.trim() || fallback.workRightPrompt.trim()

  return {
    ...suggestion,
    experienceLevel,
    targetCountry,
    targetRoles,
    workRightPrompt,
    reasons: suggestion.reasons.length ? suggestion.reasons : fallback.reasons
  }
}

function getDecisionBrief({
  context,
  state,
  fitEvaluation,
  readinessScore
}: {
  context: ProductContext
  state: CompanionDashboardState
  fitEvaluation: CountryFitEvaluation
  readinessScore: number
}): DecisionBrief {
  const missingInputs = [
    !state.profile.fullName.trim() && "candidate name",
    !state.profile.baseCvText.trim() && "CV text",
    !state.profile.workRightDetails.trim() && "work-right details",
    !state.profile.targetRoles.trim() && "target roles",
    !state.jobAnalysis.jobDescription.trim() && "job description",
    !state.jobAnalysis.jobUrl.trim() && "job URL"
  ].filter(Boolean) as string[]
  const fitRisks = fitEvaluation.components
    .filter((item) => item.status === "weak" || item.status === "blocker")
    .map((item) => `${item.label}: ${item.rationale}`)
  const evidenceFound = fitEvaluation.components.flatMap((item) =>
    item.evidence.length
      ? item.evidence.map((evidence) => `${item.label}: ${evidence}`)
      : []
  )
  const risks = [
    ...fitRisks,
    !state.profile.baseCvText.trim() &&
      "CV text is missing, so skill and ATS checks cannot be verified.",
    !state.jobAnalysis.jobDescription.trim() &&
      "Job description is missing, so role classification cannot be verified.",
    (state.jobAnalysis.gaps?.length ?? 0) > 0 && "Saved role gaps need review."
  ].filter(Boolean) as string[]

  return {
    decision: fitEvaluation.decision,
    confidence: fitEvaluation.confidence,
    score: fitEvaluation.overallScore,
    contentGate: fitEvaluation.contentGate,
    rationale: [
      `Assessment mode: ${getMarketLabel(context)} / ${context.targetCountry}.`,
      "Decision index and profile readiness are available on click in the score panels.",
      fitEvaluation.positioningAngle,
      getUrgencyGuidance(context)
    ],
    evidenceFound:
      evidenceFound.length > 0
        ? evidenceFound
        : [
            "No supporting evidence has been found yet. Add real profile, work-right and job-description details."
          ],
    risks:
      risks.length > 0
        ? risks
        : [
            "No rule-based blocker was detected. This is not employer, visa or legal confirmation."
          ],
    nextActions:
      fitEvaluation.contentGate === "ready"
        ? [
            "Save the role into the tracker.",
            "Generate application content from the approved positioning angle.",
            "Track next action and prepare interview prompts if shortlisted."
          ]
        : fitEvaluation.contentGate === "stretch"
          ? [
              "Label this as a stretch application before generating content.",
              "Clarify the weakest country, work-right or sponsorship signal.",
              "Apply only if the role is strategically important."
            ]
          : [
              fitEvaluation.nextBestAction,
              "Add missing target country, target roles and work-right details.",
              "Re-check the role before writing application content."
            ],
    missingInputs
  }
}

function getOfficialSources(targetCountry: string) {
  return officialCountrySources[targetCountry] ?? officialSourceFallback
}

function getEvidenceLedgerRows(
  fitEvaluation: CountryFitEvaluation,
  missingInputs: string[]
) {
  return [
    ...fitEvaluation.components.map((component) => ({
      id: component.key,
      check: component.label,
      status: component.status,
      explanation: component.rationale,
      evidence: component.evidence.length
        ? component.evidence
        : ["No direct supporting evidence found yet."],
      limit:
        component.status === "strong" || component.status === "medium"
          ? "Supported by saved text and rule checks, not officially verified."
          : "Requires user or employer confirmation before relying on this advice."
    })),
    ...missingInputs.map((input) => ({
      id: `missing-${input}`,
      check: `Missing: ${input}`,
      status: "missing",
      explanation: `The ${input} input is required for a stronger decision.`,
      evidence: ["No user-provided evidence is saved for this input."],
      limit: "AutoTime must not infer this from unrelated information."
    }))
  ]
}

function getVerificationChecklist({
  state,
  fitEvaluation,
  officialSources,
  trustState
}: {
  state: CompanionDashboardState
  fitEvaluation: CountryFitEvaluation
  officialSources: OfficialSource[]
  trustState: TrustState
}): VerificationChecklistItem[] {
  const hasJobDescription = Boolean(state.jobAnalysis.jobDescription.trim())
  const hasWorkRight = Boolean(state.profile.workRightDetails.trim())
  const hasTargetCountry = Boolean(state.profile.targetCountries.trim())
  const hasCv = Boolean(state.profile.baseCvText.trim())
  const hasOfficialSources = officialSources.length > 0
  const hasHardBlocker = fitEvaluation.blockers.length > 0

  return [
    {
      id: "job-description",
      label: "Job description saved",
      status: hasJobDescription ? "ready" : "needs-check",
      evidence: hasJobDescription
        ? "Job text is available for role, skill and sponsorship checks."
        : "No job description has been saved.",
      limit:
        "A thin or partial job post can hide sponsorship, location or salary constraints."
    },
    {
      id: "work-right",
      label: "Work-right position stated",
      status: hasWorkRight ? "ready" : "blocked",
      evidence: hasWorkRight
        ? state.profile.workRightDetails
        : "No work-right evidence is saved.",
      limit:
        "The user must verify work authorisation with official guidance or the employer."
    },
    {
      id: "target-country",
      label: "Target country confirmed",
      status: hasTargetCountry ? "ready" : "needs-check",
      evidence: hasTargetCountry
        ? state.profile.targetCountries
        : "No target country is saved in the profile.",
      limit:
        "Broad EU or remote roles still need country-specific hiring verification."
    },
    {
      id: "cv-evidence",
      label: "CV evidence available",
      status: hasCv ? "ready" : "needs-check",
      evidence: hasCv
        ? "CV text is saved and can be compared with role language."
        : "No CV text is saved.",
      limit:
        "Application content should not invent achievements or role experience."
    },
    {
      id: "official-source",
      label: "Official source reviewed",
      status: trustState.officialSourceReviewed
        ? "ready"
        : hasOfficialSources
          ? "needs-check"
          : "blocked",
      evidence: hasOfficialSources
        ? trustState.officialSourceReviewedAt
          ? `Reviewed on ${new Date(
              trustState.officialSourceReviewedAt
            ).toLocaleDateString()}: ${officialSources
              .map((source) => source.label)
              .join(", ")}`
          : officialSources.map((source) => source.label).join(", ")
        : "No official verification source is available for this country.",
      limit:
        "The app provides links only; the user must verify current requirements."
    },
    {
      id: "blockers",
      label: "Hard blockers resolved",
      status: hasHardBlocker ? "blocked" : "ready",
      evidence: hasHardBlocker
        ? fitEvaluation.blockers.join(" ")
        : "No hard blocker was detected by the current rules.",
      limit:
        "No detected blocker is not the same as employer, visa or legal approval."
    }
  ]
}

function getContentGuardrails({
  decisionBrief,
  verificationChecklist
}: {
  decisionBrief: DecisionBrief
  verificationChecklist: VerificationChecklistItem[]
}): ContentGuardrail[] {
  const blockedChecks = verificationChecklist.filter(
    (item) => item.status === "blocked"
  )
  const needsCheck = verificationChecklist.filter(
    (item) => item.status === "needs-check"
  )

  return [
    {
      label: "Decision gate",
      status:
        decisionBrief.contentGate === "blocked"
          ? "blocked"
          : decisionBrief.contentGate === "stretch"
            ? "warning"
            : "ready",
      reason:
        decisionBrief.contentGate === "blocked"
          ? "Application content is blocked until the strongest risk is resolved."
          : decisionBrief.contentGate === "stretch"
            ? "Content can only be drafted with a clear stretch-risk label."
            : "No content blocker was detected by the current rules."
    },
    {
      label: "Evidence minimum",
      status:
        blockedChecks.length > 0
          ? "blocked"
          : needsCheck.length > 0
            ? "warning"
            : "ready",
      reason:
        blockedChecks.length > 0
          ? "Required checks are blocked."
          : needsCheck.length > 0
            ? "Checks still need manual confirmation."
            : "Core verification checks are ready."
    },
    {
      label: "No invention rule",
      status: "ready",
      reason:
        "Generated content must only use saved profile, reusable answers and job text."
    }
  ]
}

function getReadyToApplyChecklist({
  application,
  evidenceRecords,
  profile
}: {
  application: ApplicationRecord
  evidenceRecords: EvidenceRecord[]
  profile: CandidateProfile
}): ReadyToApplyItem[] {
  const applicationEvidence = evidenceRecords.filter(
    (record) => record.applicationId === application.id
  )
  const hasMissingEvidence = applicationEvidence.some(
    (record) => record.status === "missing"
  )
  const hasRiskEvidence = applicationEvidence.some(
    (record) => record.status === "risk"
  )
  const hasContentSnapshot = Boolean(application.contentSnapshot)
  const hasWorkRight = Boolean(profile.workRightDetails.trim())
  const hasCvEvidence = Boolean(profile.baseCvText.trim())
  const hasNextAction = Boolean(application.nextAction?.trim())
  const isBlocked =
    application.contentGate === "blocked" || hasRiskEvidence || !hasWorkRight

  return [
    {
      id: "score-explained",
      label: "Score explanation saved",
      status: application.fitDecision ? "ready" : "needs-check",
      evidence: application.fitDecision
        ? `Saved recommendation: ${application.fitDecision}`
        : "No saved decision index is attached to this job.",
      action: "Analyse the role before treating this job as ready."
    },
    {
      id: "evidence-records",
      label: "Evidence checked",
      status: hasRiskEvidence
        ? "blocked"
        : hasMissingEvidence || applicationEvidence.length === 0
          ? "needs-check"
          : "ready",
      evidence: applicationEvidence.length
        ? "Evidence records are saved for this job."
        : "No evidence records are saved for this job.",
      action: "Review missing or risk evidence before applying."
    },
    {
      id: "cv-proof",
      label: "CV proof available",
      status: hasCvEvidence ? "ready" : "needs-check",
      evidence: hasCvEvidence
        ? "Saved CV text is available for truthful tailoring."
        : "CV text is missing.",
      action: "Add CV text so application content can stay evidence-based."
    },
    {
      id: "application-content",
      label: "Application content saved",
      status: hasContentSnapshot ? "ready" : "needs-check",
      evidence: hasContentSnapshot
        ? `Saved on ${new Date(
            application.contentSnapshot?.savedAt ?? application.createdAt
          ).toLocaleDateString()}.`
        : "No tailored answer or cover-letter snapshot is saved yet.",
      action: "Save a tailored content snapshot before applying."
    },
    {
      id: "work-right",
      label: "Work-right statement verified",
      status: hasWorkRight ? "ready" : "blocked",
      evidence: hasWorkRight
        ? profile.workRightDetails
        : "No work-right details are saved.",
      action:
        "Add truthful work-right details and check official sources or a qualified adviser for immigration decisions."
    },
    {
      id: "next-action",
      label: "Next action clear",
      status: hasNextAction ? "ready" : "needs-check",
      evidence: hasNextAction
        ? (application.nextAction ?? "")
        : "No next action is set.",
      action: "Set the next manual step so the job does not get lost."
    },
    {
      id: "final-gate",
      label: "Final apply gate",
      status: isBlocked
        ? "blocked"
        : application.contentGate === "stretch" || hasMissingEvidence
          ? "needs-check"
          : "ready",
      evidence: isBlocked
        ? "A blocker or risk is still present."
        : application.contentGate === "stretch"
          ? "This is a stretch application."
          : "No saved blocker is currently attached to this job.",
      action:
        "Apply only after unsupported claims, blockers and missing evidence are resolved."
    }
  ]
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
  const [isCopilotThinking, setIsCopilotThinking] = useState(false)
  const [cloudSyncConsent, setCloudSyncConsent] = useState(false)
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(
    defaultSyncPreferences
  )
  const [trustState, setTrustState] = useState<TrustState>(defaultTrustState)
  const [showFirstRunWalkthrough, setShowFirstRunWalkthrough] = useState(false)
  const applicationSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const profileSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const hasUnsyncedDashboardChangesRef = useRef(false)
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
  const fitScore = useMemo(
    () => getFitScore(state.profile, state.jobAnalysis),
    [state.profile, state.jobAnalysis]
  )
  const outcomeLearningSignals = useMemo(
    () => getOutcomeLearningSignals(state.applications),
    [state.applications]
  )
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
          candidatePosition: productContext.candidatePosition,
          targetCountry: productContext.targetCountry,
          outcomeSignals: outcomeLearningSignals
        }
      }),
    [
      state.profile,
      state.jobAnalysis,
      productContext,
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
        context: productContext,
        state,
        fitEvaluation,
        readinessScore
      }),
    [productContext, state, fitEvaluation, readinessScore]
  )
  const officialSources = useMemo(
    () => getOfficialSources(productContext.targetCountry),
    [productContext.targetCountry]
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
  const persistedOutcomeRecords = state.outcomeRecords ?? []
  const selectedApplication = applicationId
    ? state.applications.find((application) => application.id === applicationId)
    : undefined
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
  const followUpApplications = state.applications.filter(
    (application) =>
      application.status !== "Archived" &&
      application.status !== "Rejected" &&
      (application.nextAction?.trim() || application.status === "Saved")
  )
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
      ? "Analyse Fit"
      : currentTab === "profile"
        ? "Profile Evidence"
        : currentTab === "applications"
          ? "Tracked Jobs"
          : "Interview Prep"
  const showHeaderJobActions =
    profileReadyForExecution &&
    (isOverview || currentTab === "jobs" || currentTab === "applications")
  const showActionPanel = activeFocus !== "autofill-profile"
  const showExecutivePanel =
    isOverview || (profileReadyForExecution && currentTab === "jobs")
  const showProfileSettingsPanel =
    activeFocus === "autofill-profile" || activeFocus === "settings"
  const showApplicationAnalytics =
    activeFocus === "insights" && !selectedApplication
  const showFollowUpQueue = activeFocus === "follow-ups" && !selectedApplication
  const showApplicationList =
    activeFocus !== "insights" && !showFollowUpQueue && !selectedApplication
  const showInterviewPrepPacks = activeFocus === "interview-prep"
  const isProfileGateRequired =
    !profileReadyForExecution && !isOverview && currentTab !== "profile"
  const isDashboardProtocolLocked =
    !profileReadyForExecution &&
    activeFocus !== "autofill-profile"
  const canSaveCheckedJob = hasJobDraft(state.jobAnalysis)
  const decisionTone =
    decisionBrief.contentGate === "ready"
      ? "good"
      : decisionBrief.contentGate === "stretch"
        ? "warn"
        : "blocked"
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
          ? "Follow-ups or status updates need attention."
          : "Nothing urgent is waiting."
    },
    {
      title: "Latest job check",
      value: `${fitEvaluation.overallScore}/100`,
      hideMetric: true,
      tone: decisionTone,
      progress: fitEvaluation.overallScore,
      body: fitEvaluation.decision
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
          ? "Some decision inputs are missing."
          : "Ready for job checks."
    },
    {
      title: "Job risk",
      value: riskLabel,
      hideMetric: false,
      tone: decisionTone,
      progress:
        decisionBrief.contentGate === "ready"
          ? 100
          : decisionBrief.contentGate === "stretch"
            ? 62
            : 28,
      body:
        decisionBrief.contentGate === "ready"
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
          ? "Some tracked jobs have progressed."
          : "No tracked jobs have progressed yet."
    },
    {
      title: "Follow-ups",
      value: `${activeActionCount}`,
      hideMetric: true,
      tone: followUpTone,
      progress: activeActionCount > 0 ? 45 : 100,
      body: "Next steps across tracked jobs."
    },
    {
      title: "Interview",
      value: `${state.interviewPrepPacks.length} prep packs`,
      hideMetric: state.interviewPrepPacks.length > 0,
      tone: state.interviewPrepPacks.length > 0 ? "good" : "neutral",
      progress: Math.min(100, state.interviewPrepPacks.length * 34),
      body: "Tracked jobs and interview stages feed prep."
    }
  ]
  const onboardingSteps = [
    {
      href: "/dashboard/autofill-profile",
      step: "Step 1",
      title: "Build your evidence profile",
      status: profileReadyForExecution ? "Ready" : "Needs evidence",
      hideStatusMetric: !profileReadyForExecution,
      detail: profileReadyForExecution
        ? "Your profile can support job checks, tracker actions and AI coaching."
        : "Complete the profile alert items to unlock evidence-led execution tools.",
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
      title: "Connect the extension",
      status:
        state.applications.length > 0 ? "Capturing jobs" : "Not connected",
      hideStatusMetric: false,
      detail:
        state.applications.length > 0
          ? "Tracked roles are reaching your dashboard."
          : "Install and connect the browser extension so job descriptions can be parsed automatically.",
      cta:
        state.applications.length > 0 ? "View connection" : "Connect extension",
      tone: state.applications.length > 0 ? "good" : "neutral"
    },
    {
      href: "/dashboard/match-score",
      step: "Step 3",
      title: "Check one quality role",
      status: hasJobDraft(state.jobAnalysis)
        ? `${fitEvaluation.overallScore}/100 match`
        : "Waiting for a role",
      hideStatusMetric: hasJobDraft(state.jobAnalysis),
      detail: hasJobDraft(state.jobAnalysis)
        ? fitEvaluation.decision
        : "Load an extension-parsed job or paste a JD manually before applying.",
      cta: "Analyse Fit",
      tone: hasJobDraft(state.jobAnalysis) ? decisionTone : "neutral"
    },
    {
      href: "/dashboard/applications",
      step: "Step 4",
      title: "Track the next action",
      status:
        state.applications.length > 0
          ? `${state.applications.length} saved`
          : "No tracked jobs yet",
      hideStatusMetric: state.applications.length > 0,
      detail:
        activeActionCount > 0
          ? "Follow-ups need attention."
          : state.applications.length > 0
            ? "Keep status, notes and next steps visible in the tracker."
            : "Save your first role before managing tracker stages.",
      cta: "Open tracker",
      tone:
        activeActionCount > 0
          ? "warn"
          : state.applications.length > 0
            ? "good"
            : "neutral"
    },
    {
      href: "/dashboard/interview",
      step: "Step 5",
      title: "Prepare evidence-led interviews",
      status:
        interviewApplications.length > 0
          ? `${interviewApplications.length} interview role${
              interviewApplications.length === 1 ? "" : "s"
            }`
          : "Not ready yet",
      hideStatusMetric: interviewApplications.length > 0,
      detail:
        interviewApplications.length > 0
          ? "Generate coaching from your profile evidence and tracked role context."
          : "Move a tracked application to Interview before generating prep packs.",
      cta: "Open interview coach",
      tone: interviewApplications.length > 0 ? "good" : "neutral"
    }
  ]
  const commandQuickActions = [
    {
      href: "/dashboard/applications",
      label: "Tracked Jobs",
      title: "Review tracked roles",
      body: "Check which roles need a decision, status update or next action."
    },
    {
      href: "/dashboard/match-score",
      label: "Analyse Fit",
      title: canSaveCheckedJob ? "Track this job" : "Analyse a role",
      body: canSaveCheckedJob
        ? "A role is ready to save into your tracker with evidence attached."
        : "Paste a job description to see fit, missing proof and limits."
    },
    {
      href: "/dashboard/follow-ups",
      label: "Follow-ups",
      title: activeActionCount > 0 ? "Follow-ups due" : "Follow-ups are clear",
      body:
        activeActionCount > 0
          ? "Move the next action forward before it gets buried."
          : "No urgent follow-up is waiting from tracked jobs."
    }
  ]
  const todayAction = !profileReadyForExecution
    ? {
        body: "Locked until your evidence profile reaches the required readiness. This keeps job checks, tracker actions and interview answers grounded in your real proof.",
        cta: "Unlock profile",
        href: "/dashboard/autofill-profile",
        label: "Locked",
        title: "Evidence gate is active"
      }
    : state.applications.length === 0
      ? {
          body: "Analyse one role manually or track it from the extension. Tracked jobs will appear in your tracker.",
          cta: "Analyse Fit",
          href: "/dashboard/match-score",
          label: "Best next step",
          title: "Save your first job"
        }
      : activeActionCount > 0
        ? {
            body: "Saved roles need a follow-up or status update.",
            cta: "Open follow-ups",
            href: "/dashboard/follow-ups",
            label: "Best next step",
            title: "Handle the next action"
          }
        : {
            body: "Your tracked jobs are tidy. Review recent roles or analyse another job when you are ready.",
            cta: "Review tracker",
            href: "/dashboard/applications",
            label: "Best next step",
            title: "Keep your tracker tidy"
          }

  const loadDashboardSnapshot = useCallback(
    async ({
      silent = false,
      successMessage = "Synced dashboard workflow loaded"
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

      if (silent && hasUnsyncedDashboardChangesRef.current) {
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
          if (!silent) {
            setStatus("No synced dashboard workflow found for this account yet")
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

      try {
        const response = await fetch("/api/sync/profile", {
          cache: "no-store"
        })
        const body = (await response.json()) as {
          data: { profile: CandidateProfile | null } | null
          error: string | null
        }

        if (!response.ok || body.error) {
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

        setState((current) => {
          const nextState = {
            ...current,
            profile: syncedProfile
          }
          saveState(nextState, userId)
          return nextState
        })

        if (!silent) {
          setStatus(successMessage)
        }
        return true
      } catch (error: unknown) {
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
    setState(getStoredState(userId))
    setProductContext(getStoredProductContext(userId))
    setTrustState(getStoredTrustState(userId))
    setShowFirstRunWalkthrough(
      window.localStorage.getItem(
        getUserScopedStorageKey(walkthroughStorageKey, userId)
      ) !== "true"
    )
    const storedSyncPreferences = getStoredSyncPreferences(userId)
    setSyncPreferences(storedSyncPreferences)
    setCloudSyncConsent(storedSyncPreferences.profileAccountSyncEnabled)
    if (storedSyncPreferences.profileAccountSyncEnabled) {
      void loadDashboardSnapshot({ silent: true })
      void loadProfileSnapshot({ silent: true })
    }
  }, [loadDashboardSnapshot, loadProfileSnapshot, userId])

  useEffect(() => {
    if (!syncPreferences.profileAccountSyncEnabled) {
      return
    }

    const refreshSyncedWorkflow = () => {
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
    }, 15000)

    return () => {
      window.removeEventListener("focus", refreshSyncedWorkflow)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.clearInterval(intervalId)
    }
  }, [
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
    }).catch(() => undefined)
  }

  const runOnlineAnalytics = async () => {
    if (!requireProfileExecutionReady()) {
      return
    }

    if (!persistedEvidenceRecords.length && !persistedOutcomeRecords.length) {
      setOnlineAnalyticsStatus("Save a checked job before running analytics.")
      return
    }

    setOnlineAnalyticsStatus("Preparing evidence report from tracked jobs...")
    try {
      const response = await fetch(
        `${analyticsServiceBaseUrl}/evidence-outcomes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evidenceRecords: persistedEvidenceRecords,
            outcomeRecords: persistedOutcomeRecords
          })
        }
      )

      if (!response.ok) {
        throw new Error(`service returned ${response.status}`)
      }

      const report = (await response.json()) as OnlineAnalyticsReport
      setOnlineAnalyticsReport(report)
      setOnlineAnalyticsStatus(
        "Evidence report updated from tracked jobs and outcomes."
      )
    } catch (error) {
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

    if (profileSyncTimeoutRef.current) {
      clearTimeout(profileSyncTimeoutRef.current)
    }

    profileSyncTimeoutRef.current = setTimeout(() => {
      profileSyncTimeoutRef.current = null
      void syncProfileStateToCloud(profile, {
        failureMessage: "Profile saved locally. Dashboard sync failed",
        successMessage: "Profile saved and synced to dashboard"
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
    setProductContext((current) => {
      const next = { ...current, [key]: value }
      saveProductContext(next, userId)
      return next
    })
  }

  const applyMarketContextToProfile = () => {
    const market = getRoleMarket(productContext)
    const profileSettingsNote = `Profile settings: ${getMarketLabel(productContext)} / ${
      productContext.candidatePosition === "foreign-candidate"
        ? "foreign or relocating"
        : "native or local"
    } / ${productContext.targetCountry} / ${productContext.urgency}.`
    const currentJobNotes = state.jobAnalysis.notes.trim()
    const nextJobNotes = currentJobNotes.includes(profileSettingsNote)
      ? currentJobNotes
      : [currentJobNotes, profileSettingsNote].filter(Boolean).join("\n")
    const nextState = {
      ...state,
      profile: {
        ...state.profile,
        targetCountries: productContext.targetCountry,
        targetRoles: market.targetRoles,
        relocationWillingness:
          productContext.candidatePosition === "foreign-candidate"
            ? "depends"
            : state.profile.relocationWillingness
      },
      jobAnalysis: {
        ...state.jobAnalysis,
        seniority: productContext.experienceLevel,
        positioningAngle: getMarketPositioning(productContext),
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
      setStatus("Add at least 40 characters of CV text before AI review.")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    setIsReviewingCv(true)
    setContextSuggestionNote("")
    setStatus("AI is reviewing your CV for profile suggestions...")

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
          "Free AI review limit reached. Local suggestions prepared instead."
        setContextSuggestion(localSuggestion)
        setContextSuggestionSource("limit")
        setContextSuggestionNote(message)
        setStatus("AI limit reached. Local suggestions prepared for approval.")
        window.alert(`${message} Review them before applying to My Profile.`)
        return
      }

      if (!response.ok || !body.data || body.error) {
        const message = body.error
          ? `AI review unavailable: ${body.error}`
          : "AI review unavailable. Local suggestions prepared."
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
      setStatus("AI CV review complete. Approve suggestions before saving.")
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? `AI review unavailable: ${error.message}`
          : "AI review unavailable. Local suggestions prepared."
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
    } catch {
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
    persist(state, "Dashboard saved locally")
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
          profile: state.profile,
          reusableAnswers: state.reusableAnswers
        })
    )
  }, [
    activeFocus,
    activeKitApplication?.contentSnapshot,
    activeKitApplication?.id,
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

  const regenerateKitDraft = () => {
    if (!activeKitApplication) {
      setStatus("Track a job before generating application content")
      return
    }

    setKitDraft(
      createApplicationContentSnapshot({
        application: activeKitApplication,
        job: state.jobAnalysis,
        profile: state.profile,
        reusableAnswers: state.reusableAnswers
      })
    )
    setStatus("Application Kit draft regenerated from saved evidence")
  }

  const saveApplicationKitSnapshot = () => {
    if (!requireProfileExecutionReady()) {
      return
    }

    if (!activeKitApplication || !kitDraft) {
      setStatus("Track a job before saving application content")
      return
    }

    const snapshot = {
      ...kitDraft,
      savedAt: new Date().toISOString()
    }
    const nextState = {
      ...state,
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

    persist(nextState, "Application Kit saved to tracked job")
    scheduleDashboardSync(nextState, {
      failureMessage: "Application Kit saved locally. Dashboard sync failed",
      successMessage: "Application Kit saved and synced"
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
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.")
    }
  }

  const saveApplicationFromJob = async () => {
    if (!requireProfileExecutionReady()) {
      return
    }

    if (!hasJobDraft(state.jobAnalysis)) {
      setStatus(
        "Add a job title, company, URL or job description before saving"
      )
      return
    }

    const application = createApplication(
      {
        ...state.jobAnalysis,
        fitScore: fitEvaluation.overallScore,
        recommendation:
          fitEvaluation.decision === "Apply now"
            ? "High Priority"
            : fitEvaluation.decision === "Stretch application"
              ? "Stretch"
              : fitEvaluation.decision === "Skip for now"
                ? "Skip"
                : "Worth Applying",
        positioningAngle: fitEvaluation.positioningAngle,
        scoreFactors: fitEvaluation.components.map(
          (item) => `${item.label}: ${item.rationale}`
        )
      },
      fitEvaluation
    )
    const nextState = {
      ...state,
      applications: [application, ...state.applications],
      evidenceRecords: [
        ...createEvidenceRecords({
          application,
          fitEvaluation,
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
  }

  const runAiJobAnalysis = async () => {
    if (!requireProfileExecutionReady()) {
      return
    }

    if (!hasJobDraft(state.jobAnalysis)) {
      setStatus("Add a job title, company, URL or description before asking AI")
      return
    }

    try {
      setIsCopilotThinking(true)
      setStatus("AI fit assistant is checking the role against your profile...")
      const response = await fetch("/api/ai/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobAnalysis: state.jobAnalysis,
          profile: state.profile
        })
      })
      const body = (await response.json()) as {
        data: {
          result?: Partial<JobAnalysisDraft>
          upgradeUrl?: string
        } | null
        error: string | null
      }

      if (!response.ok || body.error || !body.data?.result) {
        if (body.data?.upgradeUrl) {
          window.location.href = body.data.upgradeUrl
          return
        }

        setStatus(body.error ?? "AI role analysis failed")
        return
      }

      const next = {
        ...state,
        jobAnalysis: {
          ...state.jobAnalysis,
          ...body.data.result
        }
      }

      persist(next, "AI fit assistant updated the role analysis")
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "AI role analysis failed"
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const updateApplication = (
    id: string,
    changes: Partial<ApplicationRecord>
  ) => {
    if (!requireProfileExecutionReady()) {
      return
    }

    const updatedAt = new Date().toISOString()
    const updatedApplications = state.applications.map((application) =>
      application.id === id
        ? { ...application, ...changes, updatedAt }
        : application
    )
    const updatedApplication = updatedApplications.find(
      (application) => application.id === id
    )
    const existingOutcome = (state.outcomeRecords ?? []).find(
      (record) => record.applicationId === id
    )
    const updatedOutcome = updatedApplication
      ? updateOutcomeRecordFromApplication(existingOutcome, updatedApplication)
      : null

    const nextState = {
      ...state,
      applications: updatedApplications,
      outcomeRecords: updatedOutcome
        ? [
            updatedOutcome,
            ...(state.outcomeRecords ?? []).filter(
              (record) => record.applicationId !== id
            )
          ]
        : (state.outcomeRecords ?? [])
    }

    persist(nextState, "Application and outcome record updated")
    scheduleDashboardSync(nextState, {
      failureMessage: "Application updated locally. Dashboard sync failed",
      successMessage: "Application updated and synced to dashboard"
    })
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
    if (!requireProfileExecutionReady()) {
      return
    }

    const application = state.applications.find((item) => item.id === id)

    if (!application) {
      return
    }

    try {
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
        setStatus(body.error ?? "Could not delete application from dashboard")
        return
      }
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not delete application from dashboard"
      )
      return
    }

    persist(
      removeApplicationFromState(state, id),
      "Application permanently deleted"
    )
  }

  const saveInterviewPrepPack = async (
    pack: CompanionDashboardState["interviewPrepPacks"][number],
    message: string
  ) => {
    if (!requireProfileExecutionReady()) {
      return
    }

    const nextState = {
      ...state,
      interviewPrepPacks: [
        pack,
        ...state.interviewPrepPacks.filter(
          (current) => current.applicationId !== pack.applicationId
        )
      ]
    }

    persist(nextState, message)
    hasUnsyncedDashboardChangesRef.current = true
    const synced = await syncDashboardStateToCloud(nextState, {
      failureMessage: "Interview prep saved locally. Dashboard sync failed",
      successMessage: "Interview prep saved and synced to dashboard"
    })
    hasUnsyncedDashboardChangesRef.current = !synced
    openDashboardView("interview")
  }

  const generateInterviewPrep = async (application: ApplicationRecord) => {
    if (!requireProfileExecutionReady()) {
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
    setStatus("AI is preparing an evidence-checked interview pack...")

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
        if (body.data?.upgradeUrl) {
          setStatus(
            `${body.error ?? "Upgrade required"} Local prep pack saved.`
          )
        } else {
          setStatus(body.error ?? "AI prep unavailable. Local prep pack saved.")
        }
        await saveInterviewPrepPack(
          localPack,
          "Local interview prep pack generated"
        )
        return
      }

      await saveInterviewPrepPack(
        body.data.pack,
        "AI interview prep pack generated and saved"
      )
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? `AI prep unavailable. Local prep pack saved: ${error.message}`
          : "AI prep unavailable. Local prep pack saved."
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
    setStatus("Dashboard backup exported")
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
      setStatus("Paste an exported AutoTime backup before importing")
      return
    }

    try {
      const parsed = JSON.parse(value)
      const result = companionDashboardStateSchema.safeParse(parsed)

      if (!result.success) {
        setStatus("Import failed: this backup does not match AutoTime data")
        return
      }

      persist(result.data, "Dashboard imported")
      scheduleDashboardSync(result.data, {
        failureMessage: "Dashboard imported locally. Dashboard sync failed",
        successMessage: "Dashboard imported and synced"
      })
      scheduleProfileSync(result.data.profile)
      setImportJson("")
    } catch {
      setStatus("Import failed: backup contents could not be read")
    }
  }

  const checkCloudSyncStatus = async () => {
    if (!cloudSyncReadiness.configured) {
      setStatus(
        `Account sync is not ready: ${cloudSyncReadiness.issues.join(", ")}. Your profile remains saved in this browser.`
      )
      return
    }

    const session = await getCloudSyncSessionState(
      createBrowserCloudSyncClient()
    )

    setStatus(
      session.authenticated
        ? "Account sync is ready. Profile saves as one current online record for this signed-in account."
        : "Account sync is configured, but no signed-in session was found. Sign in before syncing profile or workflow."
    )
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
      setStatus(
        error instanceof Error ? error.message : "Could not delete profile"
      )
    }
  }

  const requireProfileExecutionReady = () => {
    if (profileReadyForExecution) {
      return true
    }

    setStatus(getProfileExecutionLockMessage(readinessScore))
    return false
  }

  const activeInterviewQuestion =
    customInterviewQuestion.trim() || interviewQuestion
  const interviewDisclaimer = getInterviewBuddyDisclaimer(
    activeInterviewQuestion
  )
  const finalAnswerStorageKey = inferReusableAnswerKey(activeInterviewQuestion)
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
            ? "Keep reusable evidence ready for stronger applications."
            : currentTab === "profile"
          ? "Add the details AutoTime needs about you."
          : currentTab === "applications"
            ? "Review tracked jobs and update the next step."
            : "Prepare a clearer interview answer."
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
            : "Track a job before writing application content"
          : activeFocus === "cv-tailor"
            ? "Evidence bank is saved with your profile"
            : currentTab === "profile"
          ? profileReadyForExecution
            ? "Profile ready for job checks"
            : "Profile evidence still needs work to unlock tools."
          : currentTab === "applications"
            ? activeActionCount > 0
              ? "Next actions are waiting"
              : "No urgent next action"
            : hasInterviewBuddyOutputs
              ? "Answer draft ready"
              : "Waiting for your rough answer"
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
            : "Ready"

  const generateInterviewBuddyAnswers = async () => {
    if (!requireProfileExecutionReady()) {
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

    if (validationError) {
      setInterviewBuddyOutputs(emptyInterviewBuddyOutputs)
      setInterviewCoachMeta(emptyInterviewCoachMeta)
      setStatus(validationError)
      return
    }

    const localOutputs = createInterviewBuddyOutputs({
      draft: interviewDraftAnswer,
      profile: state.profile,
      question: activeInterviewQuestion
    })
    const localCoachMeta = createLocalInterviewCoachMeta({
      draft: interviewDraftAnswer,
      profile: state.profile,
      question: activeInterviewQuestion
    })

    setIsCopilotThinking(true)
    setStatus("AI Interview Coach is checking evidence and boundaries...")

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
        if (body.data?.upgradeUrl) {
          setStatus(
            `${body.error ?? "Upgrade required"} Open pricing to continue.`
          )
        } else {
          setStatus(
            body.error ?? "AI coach unavailable. Local evidence check used."
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
      setStatus("AI Interview Coach generated an evidence-checked answer")
      setTimeout(() => setStatus(""), 3000)
    } catch (error: unknown) {
      setInterviewBuddyOutputs(localOutputs)
      setInterviewCoachMeta(localCoachMeta)
      setStatus(
        error instanceof Error
          ? `AI coach unavailable. Local evidence check used: ${error.message}`
          : "AI coach unavailable. Local evidence check used."
      )
    } finally {
      setIsCopilotThinking(false)
    }
  }

  const generateLocalInterviewBuddyAnswers = () => {
    if (!requireProfileExecutionReady()) {
      return
    }

    const validationError = validateInterviewBuddyInput({
      draft: interviewDraftAnswer,
      question: activeInterviewQuestion
    })

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
        question: activeInterviewQuestion
      })
    )
    setInterviewCoachMeta(
      createLocalInterviewCoachMeta({
        draft: interviewDraftAnswer,
        profile: state.profile,
        question: activeInterviewQuestion
      })
    )
    setStatus("Local evidence check generated from your draft")
  }

  const saveFinalInterviewAnswer = () => {
    if (!requireProfileExecutionReady()) {
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
      `Final answer saved to ${getReusableAnswerLabel(finalAnswerStorageKey)}`
    )
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
            AutoTime unlocks job checks, tracker actions and AI interview
            coaching once your profile has enough verified evidence, so every
            recommendation is tied to real role proof, work-right context and
            candidate facts.
          </p>
        </div>
      </div>
      <details className="profile-required-details">
        <summary>View required evidence in order</summary>
        <ol className="bullets-list lock-proof-list">
          {profileGateItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>AI answers stay inside claims your profile can support.</li>
        </ol>
      </details>
      <a className="secondary-button" href="/dashboard/autofill-profile">
        Unlock profile
      </a>
    </section>
  ) : null

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">{focusCopy.eyebrow}</p>
          <h1>{focusCopy.title}</h1>
          <p>{focusCopy.body}</p>
          {showHeaderJobActions ? (
            <div className="command-header-tools">
              {currentTab !== "jobs" ? (
                <a className="secondary-button" href="/dashboard/match-score">
                  Analyse Fit
                </a>
              ) : null}
              <a className="secondary-button" href="/dashboard/applications">
                Tracked Jobs
              </a>
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
                job checks, tracker actions and AI coaching make sense from the
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
                href="/dashboard/autofill-profile"
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

      {status && <p className="status-banner">{status}</p>}

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
            aria-disabled={isDashboardProtocolLocked}
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
                <a className="secondary-button" href="/dashboard/autofill-profile">
                  Complete profile
                </a>
              </div>
            ) : null}
            <div className="dashboard-section-lock-content">
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
                      href="/dashboard/autofill-profile"
                    >
                      Finish profile
                    </a>
                    {profileReadyForExecution ? (
                      <>
                        <a
                          className="secondary-button"
                          href="/dashboard/match-score"
                        >
                          Analyse Fit
                        </a>
                        <a
                          className="secondary-button"
                          href="/dashboard/applications"
                        >
                          Open tracker
                        </a>
                      </>
                    ) : null}
                  </>
                ) : isProfileGateRequired ? (
                  <a
                    className="secondary-button"
                    href="/dashboard/autofill-profile"
                  >
                    Complete profile
                  </a>
                ) : currentTab === "jobs" ? (
                  <a className="secondary-button" href="#analyse-fit-role">
                    Open fit check
                  </a>
                ) : activeFocus === "application-answers" ? (
                  <>
                    <button
                      disabled={!activeKitApplication}
                      type="button"
                      onClick={regenerateKitDraft}
                    >
                      Generate kit draft
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
                      href="/dashboard/autofill-profile"
                    >
                      Edit profile evidence
                    </a>
                    <a
                      className="secondary-button"
                      href="/dashboard/application-answers"
                    >
                      Open Application Kit
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
                      {isReviewingCv ? "Reviewing CV" : "Review CV with AI"}
                    </button>
                    <button type="button" onClick={applyMarketContextToProfile}>
                      Apply market context
                    </button>
                  </>
                ) : currentTab === "applications" ? (
                  <>
                    <a className="secondary-button" href="/dashboard/follow-ups">
                      Open follow-ups
                    </a>
                    <a className="secondary-button" href="/dashboard/interview">
                      Open interview prep
                    </a>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={generateInterviewBuddyAnswers}>
                      Generate answers
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!hasInterviewBuddyOutputs}
                      type="button"
                      onClick={saveFinalInterviewAnswer}
                    >
                      Save final answer
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
                          Candidate evidence, work-right details and allowed AI
                          claims.
                        </p>
                        <a href="/dashboard/autofill-profile">Edit profile</a>
                      </article>
                      <article>
                        <span>Save online</span>
                        <strong>{cloudSyncReadiness.modeLabel}</strong>
                        <p>
                          {cloudSyncConsent
                            ? "Profile and workflow saving is enabled."
                            : "Browser-first saving is active until you choose sync."}
                        </p>
                        <a href="#account-sync-settings">Review saving</a>
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
                        <a href="/dashboard/extension">Open extension</a>
                      </article>
                      <article>
                        <span>Plan</span>
                        <strong>
                          {isCopilotThinking ? "AI working" : "Ready"}
                        </strong>
                        <p>
                          See what is included and what unlocks after profile
                          completion.
                        </p>
                        <a href="/pricing">View pricing</a>
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
                showProfileSettingsPanel && (
                  <section
                    className="market-context-panel"
                    aria-label="Profile settings"
                  >
                    <section
                      className="resume-intake-panel"
                      aria-label="CV context review"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Start with your CV</p>
                        <h2>Import CV first</h2>
                        <p>
                          AutoTime extracts profile suggestions first. Nothing
                          is saved until you approve it.
                        </p>
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
                          disabled={!canReviewResumeWithAi || isReviewingCv}
                          type="button"
                          onClick={reviewResumeForContext}
                        >
                          {isReviewingCv ? "Reviewing CV" : "Review CV with AI"}
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
                        Import or paste at least 40 characters, review with AI,
                        then approve the suggested fields before saving to your
                        profile.
                      </p>
                      {isReviewingCv ? (
                        <div className="cv-review-result-panel loading">
                          <strong>Reviewing CV</strong>
                          <p>
                            AutoTime is checking your CV for role focus,
                            candidate context and missing work-right evidence.
                          </p>
                        </div>
                      ) : null}
                      {contextSuggestion && (
                        <article className="suggestion-card cv-review-result-panel">
                          <header className="cv-review-result-heading">
                            <div>
                              <strong>
                                {contextSuggestionSource === "ai"
                                  ? "AI suggestion ready"
                                  : contextSuggestionSource === "limit"
                                    ? "Local suggestion ready - AI limit reached"
                                    : contextSuggestionSource === "error"
                                      ? "Local suggestion ready - AI unavailable"
                                      : contextSuggestionSource === "local"
                                        ? "Local suggestion ready - connection issue"
                                      : "Suggestion ready"}
                              </strong>
                              <p>
                                Review these fields, then click Apply approved
                                suggestions to save them to My Profile.
                              </p>
                              {contextSuggestionNote ? (
                                <p className="cv-review-result-note">
                                  {contextSuggestionNote}
                                </p>
                              ) : null}
                            </div>
                          </header>
                          <div>
                            <span>{contextSuggestion.confidence}</span>
                            <small>suggestion confidence</small>
                          </div>
                          <dl>
                            <div>
                              <dt>Work authorisation status</dt>
                              <dd>
                                {contextSuggestion.candidatePosition ===
                                "foreign-candidate"
                                  ? "Foreign / relocating"
                                  : "Native / local"}
                              </dd>
                            </div>
                            <div>
                              <dt>Target role focus</dt>
                              <dd>{getMarketLabel(contextSuggestion)}</dd>
                            </div>
                            <div>
                              <dt>Target roles</dt>
                              <dd>{contextSuggestion.targetRoles}</dd>
                            </div>
                          </dl>
                          <ul className="bullets-list">
                            {contextSuggestion.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </article>
                      )}
                    </section>

                    <div className="section-intro">
                      <p className="eyebrow">Your goals</p>
                      <h2>Check and refine your profile direction</h2>
                      <p>
                        Use the CV suggestions first, then adjust your role
                        direction, work-right context and target country.
                      </p>
                    </div>

                    <div className="context-explainer">
                      <article>
                        <span>1</span>
                        <p>
                          Import or paste your CV, then run Review CV with AI
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
                                event.target.value as CandidateUrgency
                              )
                            }
                          >
                            {urgencyOptions.map((urgency) => (
                              <option key={urgency.id} value={urgency.id}>
                                {urgency.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
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

              {currentTab === "jobs" && (
                <section
                  className="decision-brief-panel job-check-brief"
                  aria-label="UK/EU apply decision brief"
                >
                  <div>
                    <p className="eyebrow">Analyse Fit</p>
                    <h2>Evidence-led role decision</h2>
                    <p>
                      Load a tracked job or paste one role. AutoTime checks
                      fit, risk and next action against your saved evidence.
                    </p>
                    <p className="decision-method-note">
                      Rules first. Official sources and saved proof outrank AI.
                    </p>
                  </div>
                  <div className="decision-score">
                    <strong>
                      <RevealMetric label="Show decision score">
                        {decisionBrief.score}
                      </RevealMetric>
                    </strong>
                    <span>{decisionBrief.decision}</span>
                    <small>{decisionBrief.confidence} confidence</small>
                    <small>
                      {decisionBrief.contentGate === "ready"
                        ? "No content blocker detected"
                        : decisionBrief.contentGate === "stretch"
                          ? "Stretch label required"
                          : "Content blocked"}
                    </small>
                    <small>Guidance, not a guarantee</small>
                  </div>
                  <div
                    className="fit-decision-flow"
                    aria-label="Analyse Fit workflow"
                  >
                    <article>
                      <span>1</span>
                      <strong>Add role evidence</strong>
                      <p>Load a tracked job or paste title, URL and JD.</p>
                    </article>
                    <article>
                      <span>2</span>
                      <strong>Check the decision</strong>
                      <p>Review score, risk and missing proof.</p>
                    </article>
                    <article>
                      <span>3</span>
                      <strong>Save the role</strong>
                      <p>Keep useful roles with the decision attached.</p>
                    </article>
                  </div>
                  <p className="decision-integrity-note">
                    AI can enrich job text. It cannot replace rules, evidence,
                    official sources or user review.
                  </p>
                </section>
              )}

              {isOverview && (
                <section
                  className="command-centre-overview"
                  aria-label="Homepage sections"
                >
                  <div className="today-focus-panel">
                    <div>
                      <p className="eyebrow">{todayAction.label}</p>
                      <h2>{todayAction.title}</h2>
                      <p>{todayAction.body}</p>
                    </div>
                    <a href={todayAction.href}>{todayAction.cta}</a>
                  </div>
                  <div className="section-intro">
                    <p className="eyebrow">Clear onboarding</p>
                    <h2>Follow the AutoTime order</h2>
                    <p>
                      Complete each step once, then repeat the quality loop:
                      capture the right role, check fit, track the next action
                      and prepare with evidence.
                    </p>
                  </div>
                  <div
                    className="overview-workflow-map"
                    aria-label="Application workflow"
                  >
                    {onboardingSteps.map((item) => (
                      <a
                        className={`tone-${item.tone}`}
                        href={item.href}
                        key={item.title}
                      >
                        <span>{item.step}</span>
                        <strong>{item.title}</strong>
                        <em>
                          {item.hideStatusMetric ? (
                            <RevealMetric label={`Show ${item.title} status`}>
                              {item.status}
                            </RevealMetric>
                          ) : (
                            item.status
                          )}
                        </em>
                        <p>{item.detail}</p>
                        <b>{item.cta}</b>
                      </a>
                    ))}
                  </div>
                  <div
                    className="command-action-dock"
                    aria-label="Recommended actions"
                  >
                    {commandQuickActions.map((action) => (
                      <a href={action.href} key={action.href}>
                        <span>{action.label}</span>
                        <strong>{action.title}</strong>
                        <p>{action.body}</p>
                      </a>
                    ))}
                  </div>
                  <details className="dashboard-more-details">
                    <summary>More details</summary>
                    <div className="command-centre-grid">
                      {commandCentreCards.map((card) => (
                        <article
                          className={`command-centre-card tone-${card.tone}`}
                          key={card.title}
                        >
                          <div className="dashboard-card-topline">
                            <span>{card.title}</span>
                            <i aria-hidden="true" />
                          </div>
                          <strong>
                            {card.hideMetric ? (
                              <RevealMetric label={`Show ${card.title} value`}>
                                {card.value}
                              </RevealMetric>
                            ) : (
                              card.value
                            )}
                          </strong>
                          {card.hideMetric ? (
                            <RevealMeter label={`Show ${card.title} meter`}>
                              <div
                                className="dashboard-card-meter"
                                aria-hidden="true"
                              >
                                <i style={{ width: `${card.progress}%` }} />
                              </div>
                            </RevealMeter>
                          ) : (
                            <div
                              className="dashboard-card-meter"
                              aria-hidden="true"
                            >
                              <i style={{ width: `${card.progress}%` }} />
                            </div>
                          )}
                          <p>{card.body}</p>
                        </article>
                      ))}
                    </div>
                  </details>
                </section>
              )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus !== "settings" && (
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
                        workflow specific, evidence-led and safe from generic AI
                        claims.
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

              {!isOverview && currentTab === "applications" && (
                <section
                  className="tracker-pipeline-panel"
                  aria-label="Tracker pipeline"
                >
                  <div className="section-heading">
                    <p className="eyebrow">Tracker pipeline</p>
                    <h2>From saved role to final outcome</h2>
                    <p>
                      Every job keeps status, source, notes, next action and due
                      date so the workflow stays human-led and auditable.
                    </p>
                  </div>
                  <div className="tracker-pipeline-grid">
                    {applicationStatuses.map((status) => (
                      <button
                        className={
                          applicationStatusFilter === status
                            ? "active"
                            : undefined
                        }
                        key={status}
                        type="button"
                        onClick={() =>
                          setApplicationStatusFilter(
                            applicationStatusFilter === status ? "all" : status
                          )
                        }
                      >
                        <span>{status}</span>
                        <strong>
                          <RevealMetric label={`Show ${status} count`}>
                            {statusCounts[status]}
                          </RevealMetric>
                        </strong>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!isOverview && currentTab === "applications" && (
                <section
                  className="metrics-strip"
                  aria-label="Job search progress"
                >
                  <div
                    className={`metric-card ${getMetricTone(state.applications.length, 3)}`}
                  >
                    <span>
                      <RevealMetric label="Show tracked jobs count">
                        {state.applications.length}
                      </RevealMetric>
                    </span>
                    <small>Tracked jobs</small>
                    <p>Some jobs may be active beyond tracked.</p>
                  </div>
                  <div
                    className={`metric-card ${getMetricTone(interviewApplications.length, 1)}`}
                  >
                    <span>
                      <RevealMetric label="Show interview count">
                        {interviewApplications.length}
                      </RevealMetric>
                    </span>
                    <small>Interviews</small>
                    <p>Prep packs appear here when ready</p>
                  </div>
                  <div
                    className={`metric-card ${activeActionCount > 0 ? "neutral" : "warn"}`}
                  >
                    <span>
                      <RevealMetric label="Show next action count">
                        {activeActionCount}
                      </RevealMetric>
                    </span>
                    <small>Next actions</small>
                    <p>Follow-ups across tracked jobs</p>
                  </div>
                  <div className="metric-card warn">
                    <span>
                      <RevealMetric label="Show last check skill count">
                        {state.jobAnalysis.skills?.length ?? 0}
                      </RevealMetric>
                    </span>
                    <small>Last check</small>
                    <p>{riskLabel}</p>
                  </div>
                </section>
              )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "application-answers" && (
                  <section
                    className="application-kit-workspace"
                    aria-label="Application Kit workspace"
                  >
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">Application Kit</p>
                        <h2>Write for one tracked job</h2>
                        <p>
                          Draft content from saved evidence, edit it, copy it,
                          then save the snapshot back to the job.
                        </p>
                      </div>
                      {state.applications.length ? (
                        <label>
                          Tracked job
                          <select
                            value={activeKitApplication?.id ?? ""}
                            onChange={(event) => {
                              const nextApplication = state.applications.find(
                                (application) =>
                                  application.id === event.target.value
                              )
                              setKitApplicationId(event.target.value)
                              setKitDraft(
                                nextApplication
                                  ? nextApplication.contentSnapshot ??
                                      createApplicationContentSnapshot({
                                        application: nextApplication,
                                        job: state.jobAnalysis,
                                        profile: state.profile,
                                        reusableAnswers: state.reusableAnswers
                                      })
                                  : null
                              )
                            }}
                          >
                            {state.applications.map((application) => (
                              <option key={application.id} value={application.id}>
                                {[
                                  application.roleTitle || application.title,
                                  application.company,
                                  application.status
                                ]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="empty-state rich-empty-state">
                          <strong>No tracked job yet</strong>
                          <p>
                            Analyse and track one role before writing application
                            content for it.
                          </p>
                          <a
                            className="secondary-button"
                            href="/dashboard/match-score"
                          >
                            Analyse a role
                          </a>
                        </div>
                      )}
                      {activeKitApplication ? (
                        <dl className="summary-list">
                          <div>
                            <dt>Job</dt>
                            <dd>
                              {activeKitApplication.roleTitle ||
                                activeKitApplication.title}
                            </dd>
                          </div>
                          <div>
                            <dt>Company</dt>
                            <dd>
                              {activeKitApplication.company ||
                                "Unknown company"}
                            </dd>
                          </div>
                          <div>
                            <dt>Status</dt>
                            <dd>{activeKitApplication.status}</dd>
                          </div>
                        </dl>
                      ) : null}
                    </section>

                    {kitDraft ? (
                      <section className="application-kit-editor">
                        {(
                          [
                            ["profileSummary", "Profile summary"],
                            ["coverLetter", "Cover note"],
                            ["motivationAnswer", "Motivation answer"],
                            ["strengthsAnswer", "Strengths answer"],
                            ["availabilityAnswer", "Availability answer"]
                          ] as Array<[ApplicationContentField, string]>
                        ).map(([key, label]) => (
                          <article className="panel kit-field-card" key={key}>
                            <div className="kit-field-heading">
                              <div>
                                <p className="eyebrow">{label}</p>
                                <h3>{label}</h3>
                              </div>
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => copyKitField(label, kitDraft[key])}
                              >
                                Copy
                              </button>
                            </div>
                            <textarea
                              value={kitDraft[key]}
                              onChange={(event) =>
                                updateKitDraft(key, event.target.value)
                              }
                            />
                          </article>
                        ))}
                        <div className="application-actions">
                          <button type="button" onClick={saveApplicationKitSnapshot}>
                            Save kit to job
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={regenerateKitDraft}
                          >
                            Regenerate from evidence
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "cv-tailor" && (
                  <section
                    className="evidence-bank-workspace"
                    aria-label="Evidence Bank workspace"
                  >
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">Evidence Bank</p>
                        <h2>Reusable proof points</h2>
                        <p>
                          Keep factual CV evidence, projects and reusable
                          answers in one place. This is context for fit and
                          positioning, not a CV builder.
                        </p>
                      </div>
                      <label>
                        CV evidence
                        <textarea
                          placeholder="Paste factual CV text or a concise evidence summary."
                          value={state.profile.baseCvText}
                          onChange={(event) =>
                            updateProfile("baseCvText", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Experience highlights
                        <textarea
                          placeholder="Add proof points with tools, responsibilities and outcomes."
                          value={state.profile.experienceHighlights}
                          onChange={(event) =>
                            updateProfile(
                              "experienceHighlights",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <label>
                        Project examples
                        <textarea
                          placeholder="Add project, delivery or workflow improvement examples."
                          value={state.profile.projectSummaries}
                          onChange={(event) =>
                            updateProfile(
                              "projectSummaries",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">Reusable answers</p>
                        <h2>Evidence-backed answers</h2>
                        <p>
                          Save wording only when it is true and supported by
                          the evidence above.
                        </p>
                      </div>
                      {(
                        [
                          ["motivationAnswer", "Motivation answer"],
                          ["strengthsAnswer", "Strengths answer"],
                          ["workAuthorisationAnswer", "Work authorisation"],
                          ["relocationAnswer", "Relocation"],
                          ["availabilityAnswer", "Availability"],
                          ["noticePeriodAnswer", "Notice period"],
                          ["salaryExpectationAnswer", "Salary expectation"],
                          ["sponsorshipAnswer", "Sponsorship"]
                        ] as Array<[ReusableAnswerKey, string]>
                      ).map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <textarea
                            value={state.reusableAnswers[key]}
                            onChange={(event) =>
                              updateReusableAnswer(key, event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </section>
                  </section>
                )}

              {!isOverview &&
                currentTab === "profile" &&
                activeFocus === "autofill-profile" && (
                <section className="workspace-grid">
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
                        <span>About you</span>
                        <span>Work rights</span>
                        <span>Target roles</span>
                        <span>CV proof</span>
                        <span>Reusable answers</span>
                      </div>
                    </section>
                    <div className="profile-form-toolbar">
                      <div>
                        <p className="eyebrow">Saved in this browser</p>
                        <h2>Keep your profile up to date</h2>
                        <p>
                          Edit the steps below. Save online only when you want
                          this profile available on another device.
                        </p>
                      </div>
                      <div className="profile-form-actions">
                        <button
                          type="button"
                          onClick={saveDashboard}
                        >
                          Save changes
                        </button>
                        <details className="profile-action-details">
                          <summary>Online copy</summary>
                          <label className="sync-consent-control">
                            <input
                              checked={cloudSyncConsent}
                              disabled={!cloudSyncReadiness.configured}
                              type="checkbox"
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setCloudSyncConsent(true)
                                  return
                                }

                                setProfileAccountSyncEnabled(false)
                              }}
                            />
                            <span>
                              I want an online copy for this signed-in account.
                            </span>
                          </label>
                          <div className="profile-action-row">
                            <button
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={syncProfileToCloud}
                            >
                              Save online
                            </button>
                            <button
                              className="secondary-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={loadProfileFromCloud}
                            >
                              Load online copy
                            </button>
                          </div>
                          <div className="profile-action-row">
                            <button
                              className="secondary-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={syncDashboardToCloud}
                            >
                              Save job tracker online
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={checkCloudSyncStatus}
                            >
                              Check online saving
                            </button>
                          </div>
                          <details className="sync-danger-details compact">
                            <summary>Delete online profile</summary>
                            <p>
                              Removes only the profile saved to this online
                              account. Your browser copy stays here.
                            </p>
                            <button
                              className="danger-button"
                              disabled={!cloudSyncReadiness.configured}
                              type="button"
                              onClick={deleteProfileForAccount}
                            >
                              Delete online copy
                            </button>
                          </details>
                        </details>
                        <details className="profile-action-details">
                          <summary>Backups</summary>
                          <div className="profile-action-row">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={exportDashboard}
                            >
                              Export
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
                              Import
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>

                    <section className="profile-form-section">
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

                    <section className="profile-form-section">
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

                    <section className="profile-form-section important">
                      <div className="section-heading">
                        <p className="eyebrow">Step 3</p>
                        <h3>Work-right facts</h3>
                        <p>
                          Add only details you can verify. AutoTime will never
                          invent work-right, visa or sponsorship claims.
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
                    </section>

                    <section className="profile-form-section important">
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
                    </section>
                  </div>

                  <div className="output-column">
                    <section className="panel profile-quality-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Profile readiness</p>
                        <h2>{profileQualityScore}/100 ready</h2>
                        <p>
                          Use this as your readiness map. Green means AutoTime
                          can use that evidence confidently; amber or red means
                          add more proof before relying on job checks or AI
                          coaching.
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
                              <span>{signal.score}/100</span>
                            </div>
                            <p>{signal.detail}</p>
                          </article>
                        ))}
                      </div>
                      <div className="ai-claim-boundary">
                        <strong>AI claim boundary</strong>
                        <p>
                          Allowed: facts saved in your CV, profile evidence,
                          reusable answers and parsed job text. Not allowed:
                          invented experience, unverified work-right claims,
                          hidden job-site actions or unsupported
                          salary/sponsorship promises.
                        </p>
                      </div>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">At a glance</p>
                        <h2>Saved facts</h2>
                        <p>
                          These are the facts currently available for job-fit
                          and workflow decisions.
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
                          <small>Reusable answers</small>
                          <strong>Open answer evidence</strong>
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

              {!isOverview && currentTab === "jobs" && (
                <section
                  className="workspace-grid job-check-grid"
                  id="analyse-fit-role"
                >
                  <div className="input-column job-check-input">
                    <div className="section-heading">
                      <p className="eyebrow">Role evidence</p>
                      <h2>Analyse one job before you apply</h2>
                      <p>
                        Use a tracked job or paste one JD. Rules score it
                        first; AI is optional.
                      </p>
                    </div>
                    <section
                      className="job-source-panel"
                      aria-label="Tracked job source"
                    >
                      <div className="job-source-heading">
                        <div>
                          <strong>
                            {latestTrackedJobSource
                              ? "Use a tracked job"
                              : "No tracked JD available yet"}
                          </strong>
                          <p>
                            {latestTrackedJobSource
                              ? "Load saved role details and JD text."
                              : "Track a job from the extension or paste the JD below."}
                          </p>
                        </div>
                        <span
                          className={`source-mode-pill ${currentJobInputMode.className}`}
                          title={currentJobInputMode.detail}
                        >
                          {currentJobInputMode.label}
                        </span>
                      </div>
                      <div className="job-source-note">
                        <p>Current input: {currentJobInputMode.detail}</p>
                      </div>
                      {trackedJobSourceOptions.length ? (
                        <div className="job-source-actions">
                          <select
                            aria-label="Choose tracked job to analyse"
                            defaultValue=""
                            onChange={(event) => {
                              if (event.target.value) {
                                loadTrackedJobForCheck(event.target.value)
                                event.target.value = ""
                              }
                            }}
                          >
                            <option value="">Load tracked job...</option>
                            {trackedJobSourceOptions.map((application) => (
                              <option
                                key={application.id}
                                value={application.id}
                              >
                                {[
                                  application.roleTitle || application.title,
                                  application.company,
                                  getApplicationSourceLabel(application)
                                ]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </option>
                            ))}
                          </select>
                          {latestTrackedJobSource ? (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() =>
                                loadTrackedJobForCheck(
                                  latestTrackedJobSource.id
                                )
                              }
                            >
                              Use latest
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <a
                          className="secondary-button"
                          href="/dashboard/extension"
                        >
                          Connect extension
                        </a>
                      )}
                    </section>
                    <p className="job-check-save-note">
                      Automatic means extension-captured. Manual means pasted
                      here.
                    </p>
                    <div className="job-check-field-grid">
                      <label>
                        Job title
                        <input
                          placeholder="Business Systems Analyst"
                          value={state.jobAnalysis.jobTitle}
                          onChange={(event) =>
                            updateJob("jobTitle", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Company
                        <input
                          placeholder="Company name"
                          value={state.jobAnalysis.company}
                          onChange={(event) =>
                            updateJob("company", event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Job URL
                      <input
                        placeholder="https://..."
                        value={state.jobAnalysis.jobUrl}
                        onChange={(event) =>
                          updateJob("jobUrl", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Job description
                      <textarea
                        className="job-description-input"
                        placeholder="Manual fallback: paste the role description, requirements, location, sponsorship notes and salary details if this job was not parsed from the extension."
                        value={state.jobAnalysis.jobDescription}
                        onChange={(event) =>
                          updateJob("jobDescription", event.target.value)
                        }
                      />
                    </label>
                    <button
                      disabled={!canSaveCheckedJob}
                      type="button"
                      onClick={saveApplicationFromJob}
                    >
                      Save to Tracked Jobs
                    </button>
                    <p className="job-check-save-note">
                      Saves the score, risks and next action with the role.
                    </p>
                  </div>

                  <div className="output-column job-check-results">
                    <section className="panel country-fit-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Analyse Fit result</p>
                        <h2>Should you apply?</h2>
                        <span
                          className={`source-mode-pill ${currentJobInputMode.className}`}
                          title={currentJobInputMode.detail}
                        >
                          {currentJobInputMode.label}
                        </span>
                      </div>
                      <div
                        className="ai-audit-summary"
                        aria-label="Analyse Fit evidence audit"
                      >
                        <article>
                          <span>Method</span>
                          <strong>Rules first</strong>
                          <p>
                            Evidence-first scoring and country rules drive the
                            decision. AI assistance is optional.
                          </p>
                        </article>
                        <article>
                          <span>Evidence used</span>
                          <strong>
                            <RevealMetric label="Show evidence used count">
                              {decisionBrief.evidenceFound.length}
                            </RevealMetric>
                          </strong>
                          <p>
                            {decisionBrief.evidenceFound[0] ||
                              "No strong evidence found yet."}
                          </p>
                        </article>
                        <article>
                          <span>Missing</span>
                          <strong>
                            <RevealMetric label="Show missing input count">
                              {decisionBrief.missingInputs.length}
                            </RevealMetric>
                          </strong>
                          <p>
                            {decisionBrief.missingInputs[0] ||
                              "Core inputs are present."}
                          </p>
                        </article>
                        <article>
                          <span>Risk flags</span>
                          <strong>
                            <RevealMetric label="Show risk flag count">
                              {decisionBrief.risks.length}
                            </RevealMetric>
                          </strong>
                          <p>
                            {decisionBrief.risks[0] ||
                              "No major risk flagged yet."}
                          </p>
                        </article>
                        <article>
                          <span>Do not claim</span>
                          <strong>{decisionBrief.confidence}</strong>
                          <p>
                            Do not claim work-right, sponsorship, salary or
                            experience details that are not in the profile or
                            parsed JD.
                          </p>
                        </article>
                      </div>
                      <div className="fit-gate-banner">
                        <strong>
                          <RevealMetric label="Show job fit score">
                            {fitEvaluation.overallScore}
                          </RevealMetric>
                        </strong>
                        <span>
                          {fitEvaluation.contentGate === "ready"
                            ? "No content blocker detected by current rules"
                            : fitEvaluation.contentGate === "stretch"
                              ? "Stretch application: label the risk"
                            : "Do not write content yet"}
                        </span>
                      </div>
                      <div
                        className="fit-decision-flow compact"
                        aria-label="Analyse Fit decision"
                      >
                        <article>
                          <span>1</span>
                          <strong>{fitEvaluation.decision}</strong>
                          <p>{decisionBrief.rationale[0]}</p>
                        </article>
                        <article>
                          <span>2</span>
                          <strong>Check first</strong>
                          <p>
                            {decisionBrief.risks[0] ||
                              decisionBrief.missingInputs[0] ||
                              "No major blocker is visible from the saved evidence."}
                          </p>
                        </article>
                        <article>
                          <span>3</span>
                          <strong>Next action</strong>
                          <p>{decisionBrief.nextActions[0]}</p>
                        </article>
                      </div>
                      <section
                        className="fit-trust-panel"
                        aria-label="Official source and AI integrity check"
                      >
                        <div>
                          <span>{officialSourceStatusLabel}</span>
                          <strong>Official source and employer wording first</strong>
                          <p>
                            Official sources and employer wording must be
                            checked before relying on work-right, sponsorship,
                            relocation or location-fit advice.
                          </p>
                        </div>
                        <div className="fit-trust-sources">
                          {officialSources.slice(0, 2).map((source) => (
                            <a
                              href={source.url}
                              key={source.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {source.label}
                            </a>
                          ))}
                        </div>
                        <p className="fit-ai-boundary">
                          AI output cannot override official sources, saved
                          profile evidence, parsed job text or your review.
                        </p>
                        <label className="official-review-control">
                          <input
                            checked={trustState.officialSourceReviewed}
                            type="checkbox"
                            onChange={(event) =>
                              setOfficialSourceReviewed(event.target.checked)
                            }
                          />
                          I checked the official source for this country and
                          understand AutoTime is guidance, not work-right, visa
                          or sponsorship approval.
                        </label>
                      </section>
                      <div className="fit-decision-actions">
                        <button
                          disabled={!canSaveCheckedJob}
                          type="button"
                          onClick={saveApplicationFromJob}
                        >
                          Save to Tracked Jobs
                        </button>
                        <a className="secondary-button" href="#analyse-fit-role">
                          Edit role evidence
                        </a>
                      </div>
                      <details className="fit-supporting-details">
                        <summary>Show scoring details</summary>
                        <div className="country-rule-strip">
                          <div>
                            <strong>{fitEvaluation.countryRule.name}</strong>
                            <span>{fitEvaluation.countryRule.marketNote}</span>
                          </div>
                          <dl>
                            <div>
                              <dt>Sponsorship</dt>
                              <dd>
                                {fitEvaluation.countryRule.sponsorshipStrictness}
                              </dd>
                            </div>
                            <div>
                              <dt>Relocation</dt>
                              <dd>
                                {fitEvaluation.countryRule.relocationFriction}
                              </dd>
                            </div>
                            <div>
                              <dt>Outcomes</dt>
                              <dd>
                                <RevealMetric label="Show tracked outcome count">
                                  {outcomeLearningSignals.totalTracked}
                                </RevealMetric>
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="fit-component-grid">
                          {fitEvaluation.components.map((item) => (
                            <article
                              className={`fit-component ${item.status}`}
                              key={item.key}
                            >
                              <div>
                                <strong>{item.label}</strong>
                                <span>
                                  <RevealMetric
                                    label={`Show ${item.label} score`}
                                  >
                                    {item.score}/100
                                  </RevealMetric>
                                </span>
                              </div>
                              <small>{item.status}</small>
                              <p>{item.rationale}</p>
                              <ul className="component-evidence-list">
                                {item.evidence.length ? (
                                  item.evidence.map((evidence) => (
                                    <li key={evidence}>{evidence}</li>
                                  ))
                                ) : (
                                  <li>
                                    No direct supporting evidence found yet.
                                  </li>
                                )}
                              </ul>
                            </article>
                          ))}
                        </div>
                        {fitEvaluation.blockers.length ? (
                          <ul className="bullets-list blocker-list">
                            {fitEvaluation.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="empty-state">
                            No blocker was detected by the current rules.
                            Verify employer requirements before applying.
                          </p>
                        )}
                        <ul className="evidence-list">
                          {fitEvaluation.evidenceChecklist
                            .slice(0, 4)
                            .map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                        </ul>
                      </details>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">Positioning first</p>
                        <h2>
                          {fitEvaluation.contentGate === "blocked"
                            ? "Check the blocker before applying"
                            : "Best angle for this job"}
                        </h2>
                      </div>
                      <p className="large-copy">
                        {fitEvaluation.positioningAngle}
                      </p>
                      <ul className="bullets-list">
                        {[
                          fitEvaluation.nextBestAction,
                          ...(state.jobAnalysis.scoreFactors ?? [])
                        ].map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <p className="eyebrow">What to check</p>
                        <h2>Skills, location and gaps</h2>
                      </div>
                      <div className="tag-row">
                        {(state.jobAnalysis.skills?.length
                          ? state.jobAnalysis.skills
                          : ["No skills detected yet"]
                        ).map((skill) => (
                          <span className="tag" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                      <ul className="bullets-list">
                        {(state.jobAnalysis.gaps?.length
                          ? state.jobAnalysis.gaps
                          : ["No gaps saved yet."]
                        ).map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </section>
              )}

              {currentTab === "jobs" && (
                <section
                  className="panel fit-ai-assist-panel"
                  aria-label="Optional Analyse Fit AI assistant"
                >
                  <div className="section-heading">
                    <p className="eyebrow">Optional AI</p>
                    <h2>Refine the role analysis</h2>
                    <p>
                      Use AI after the rules-led check to summarise the JD,
                      surface gaps and update the analysis. Evidence and
                      official sources stay in control.
                    </p>
                  </div>
                  <button
                    disabled={isCopilotThinking || !hasJobDraft(state.jobAnalysis)}
                    type="button"
                    onClick={runAiJobAnalysis}
                  >
                    {isCopilotThinking ? "Checking role" : "Use AI assistant"}
                  </button>
                </section>
              )}

              {currentTab === "jobs" && (
                <details className="audit-details job-check-audit">
                  <summary>Audit and source checks</summary>
                  <section
                    className="trust-grid"
                    aria-label="Evidence and official verification"
                  >
                    <section className="evidence-ledger-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Details</p>
                        <h2>Why AutoTime suggested this</h2>
                      </div>
                      <div className="ledger-table">
                        {evidenceLedgerRows.map((row) => (
                          <article className="ledger-row" key={row.id}>
                            <div>
                              <strong>{row.check}</strong>
                              <span className={`ledger-status ${row.status}`}>
                                {row.status}
                              </span>
                            </div>
                            <p>{row.explanation}</p>
                            <dl>
                              <div>
                                <dt>Matched detail</dt>
                                <dd>{row.evidence.join(" ")}</dd>
                              </div>
                              <div>
                                <dt>Limit</dt>
                                <dd>{row.limit}</dd>
                              </div>
                            </dl>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="content-guardrail-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Writing safety</p>
                        <h2>Before generating content</h2>
                      </div>
                      <div className="guardrail-list">
                        {contentGuardrails.map((item) => (
                          <article className="guardrail-item" key={item.label}>
                            <div>
                              <strong>{item.label}</strong>
                              <span
                                className={`guardrail-status ${item.status}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p>{item.reason}</p>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="verification-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Before applying</p>
                        <h2>Manual verification checklist</h2>
                      </div>
                      <div className="verification-list">
                        {verificationChecklist.map((item) => (
                          <article className="verification-item" key={item.id}>
                            <div>
                              <strong>{item.label}</strong>
                              <span
                                className={`verification-status ${item.status}`}
                              >
                                {item.status === "ready"
                                  ? "ready"
                                  : item.status === "blocked"
                                    ? "blocked"
                                    : "check"}
                              </span>
                            </div>
                            <p>{item.evidence}</p>
                            <small>{item.limit}</small>
                          </article>
                        ))}
                      </div>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={exportDecisionAudit}
                      >
                        Export decision audit
                      </button>
                    </section>

                    <section className="official-source-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Official verification</p>
                        <h2>Official sources</h2>
                      </div>
                      <div className="official-source-list">
                        {officialSources.map((source) => (
                          <a
                            href={source.url}
                            key={source.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <strong>{source.label}</strong>
                            <span>{source.note}</span>
                          </a>
                        ))}
                      </div>
                      <label className="official-review-control">
                        <input
                          checked={trustState.officialSourceReviewed}
                          type="checkbox"
                          onChange={(event) =>
                            setOfficialSourceReviewed(event.target.checked)
                          }
                        />
                        I have reviewed the official source for this country and
                        understand AutoTime does not authorise work, visa or
                        sponsorship status.
                      </label>
                    </section>
                  </section>
                </details>
              )}

              {!isOverview && currentTab === "applications" && (
                <section className="applications-section full-width-section">
                  <div className="section-intro">
                    <p className="eyebrow">{focusCopy.eyebrow}</p>
                    <h2>{focusCopy.title}</h2>
                    <p>{focusCopy.body}</p>
                  </div>
                  {activeFocus !== "insights" && !showFollowUpQueue && (
                    <div
                      className="pipeline-summary"
                      aria-label="Application status counts"
                    >
                      {applicationStatuses.map((status) => (
                        <div key={status}>
                          <span>
                            <RevealMetric label={`Show ${status} count`}>
                              {statusCounts[status]}
                            </RevealMetric>
                          </span>
                          <small>{status}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {showApplicationAnalytics && (
                    <>
                      <section
                        className="analytics-grid"
                        aria-label="Evidence and outcome analytics"
                      >
                        <article>
                          <span>
                            <RevealMetric label="Show saved check count">
                              {persistedEvidenceRecords.length}
                            </RevealMetric>
                          </span>
                          <strong>Saved fit checks</strong>
                          <p>
                            Checks stored from tracked jobs and profile details.
                          </p>
                        </article>
                        <article>
                          <span>
                            <RevealMetric label="Show outcome record count">
                              {outcomeAnalytics.total}
                            </RevealMetric>
                          </span>
                          <strong>Outcome history</strong>
                          <p>Tracked decisions with status and result changes.</p>
                        </article>
                        <article>
                          <span>
                            <RevealMetric label="Show interview signal count">
                              {outcomeAnalytics.interviews}
                            </RevealMetric>
                          </span>
                          <strong>Interview signals</strong>
                          <p>
                            Tracked interview outcomes for future calibration.
                          </p>
                        </article>
                        <article>
                          <span>
                            {outcomeAnalytics.calibrationReady
                              ? "Ready"
                              : "Collecting"}
                          </span>
                          <strong>Calibration status</strong>
                          <p>
                            {outcomeAnalytics.calibrationReady
                              ? "Enough history exists to begin fit calibration."
                              : "Decision Index remains non-probability until enough outcomes exist."}
                          </p>
                        </article>
                      </section>
                      <section className="online-analytics-panel">
                        <div className="section-heading">
                          <p className="eyebrow">Evidence report</p>
                          <h2>Evidence and outcome report</h2>
                          <p>Descriptive report from tracked jobs only.</p>
                        </div>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={runOnlineAnalytics}
                        >
                          Run evidence report
                        </button>
                        {onlineAnalyticsStatus ? (
                          <p className="status-message">
                            {onlineAnalyticsStatus}
                          </p>
                        ) : null}
                        {onlineAnalyticsReport ? (
                          <div className="online-analytics-results">
                            <article>
                              <span>
                                <RevealMetric label="Show observed interview rate">
                                  {Math.round(
                                    onlineAnalyticsReport.summary
                                      .observedInterviewRate
                                  )}
                                  %
                                </RevealMetric>
                              </span>
                              <strong>Observed interview rate</strong>
                              <p>Based only on tracked outcome history.</p>
                            </article>
                            <article>
                              <span>
                                {onlineAnalyticsReport.summary.calibrationReady
                                  ? "Ready"
                                  : "Collecting"}
                              </span>
                              <strong>Calibration readiness</strong>
                              <p>
                                {
                                  onlineAnalyticsReport.summary
                                    .calibrationStatus
                                }
                              </p>
                            </article>
                            <article>
                              <span>
                                <RevealMetric label="Show interview signal count">
                                  {
                                    onlineAnalyticsReport.summary
                                      .interviewSignals
                                  }
                                </RevealMetric>
                              </span>
                              <strong>Interview signals</strong>
                              <p>
                                Outcome history marked as interview or final
                                stage.
                              </p>
                            </article>
                            <article>
                              <span>
                                <RevealMetric label="Show evidence row count">
                                  {
                                    onlineAnalyticsReport.mlReadiness
                                      .featureRows
                                  }
                                </RevealMetric>
                              </span>
                              <strong>Evidence rows</strong>
                              <p>
                                {
                                  onlineAnalyticsReport.mlReadiness
                                    .allowedOutput
                                }
                              </p>
                            </article>
                            <article>
                              <span>
                                {onlineAnalyticsReport.mlReadiness
                                  .modelTrainingReady
                                  ? "Ready"
                                  : "Locked"}
                              </span>
                              <strong>Model training</strong>
                              <p>
                                Blocked output:{" "}
                                {
                                  onlineAnalyticsReport.mlReadiness
                                    .blockedOutput
                                }
                                .
                              </p>
                            </article>
                            <article>
                              <span>
                                {onlineAnalyticsReport.mlReadiness.stage}
                              </span>
                              <strong>Learning readiness</strong>
                              <p>{onlineAnalyticsReport.mlReadiness.message}</p>
                            </article>
                            <div className="score-band-table">
                              <strong>Fit-band outcomes</strong>
                              {onlineAnalyticsReport.scoreBands.length ? (
                                onlineAnalyticsReport.scoreBands.map((band) => (
                                  <div key={band.band}>
                                    <span>
                                      <RevealMetric label="Show score band">
                                        {band.band}
                                      </RevealMetric>
                                    </span>
                                    <span>
                                      <RevealMetric
                                        label={`Show ${band.band} record count`}
                                      >
                                        {band.records} records
                                      </RevealMetric>
                                    </span>
                                    <span>
                                      <RevealMetric
                                        label={`Show ${band.band} interview count`}
                                      >
                                        {band.interviews} interviews
                                      </RevealMetric>
                                    </span>
                                    <span>
                                      <RevealMetric
                                        label={`Show ${band.band} observed rate`}
                                      >
                                        {Math.round(band.observedInterviewRate)}
                                        % observed
                                      </RevealMetric>
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p>No fit-band outcomes yet.</p>
                              )}
                            </div>
                            <div className="score-band-table">
                              <strong>Content gate outcomes</strong>
                              {onlineAnalyticsReport.contentGates.length ? (
                                onlineAnalyticsReport.contentGates.map(
                                  (gate) => (
                                    <div key={gate.gate}>
                                      <span>{gate.gate}</span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${gate.gate} record count`}
                                        >
                                          {gate.records} records
                                        </RevealMetric>
                                      </span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${gate.gate} interview count`}
                                        >
                                          {gate.interviews} interviews
                                        </RevealMetric>
                                      </span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${gate.gate} observed rate`}
                                        >
                                          {Math.round(
                                            gate.observedInterviewRate
                                          )}
                                          % observed
                                        </RevealMetric>
                                      </span>
                                    </div>
                                  )
                                )
                              ) : (
                                <p>No content-gate outcomes yet.</p>
                              )}
                            </div>
                            <div className="score-band-table">
                              <strong>Risk segment outcomes</strong>
                              {onlineAnalyticsReport.riskSegments.length ? (
                                onlineAnalyticsReport.riskSegments.map(
                                  (segment) => (
                                    <div key={segment.segment}>
                                      <span>{segment.segment}</span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${segment.segment} record count`}
                                        >
                                          {segment.records} records
                                        </RevealMetric>
                                      </span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${segment.segment} interview count`}
                                        >
                                          {segment.interviews} interviews
                                        </RevealMetric>
                                      </span>
                                      <span>
                                        <RevealMetric
                                          label={`Show ${segment.segment} observed rate`}
                                        >
                                          {Math.round(
                                            segment.observedInterviewRate
                                          )}
                                          % observed
                                        </RevealMetric>
                                      </span>
                                    </div>
                                  )
                                )
                              ) : (
                                <p>No risk segment outcomes yet.</p>
                              )}
                            </div>
                            <div className="analytics-limits">
                              {onlineAnalyticsReport.limits.map((limit) => (
                                <p key={limit}>{limit}</p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </section>
                      <section className="evidence-outcome-panel">
                        <div className="section-heading">
                          <p className="eyebrow">Evidence engine</p>
                          <h2>Latest persisted evidence</h2>
                          <p>
                            These records are saved with applications so future
                            scoring can be audited and calibrated against real
                            outcomes.
                          </p>
                        </div>
                        <div className="evidence-record-list">
                          {persistedEvidenceRecords.length ? (
                            persistedEvidenceRecords
                              .slice(0, 6)
                              .map((record) => (
                                <article
                                  className="evidence-record-card"
                                  key={record.id}
                                >
                                  <div>
                                    <strong>{record.checkLabel}</strong>
                                    <span>{record.status}</span>
                                  </div>
                                  <p>{record.evidenceText}</p>
                                  <small>{record.explanation}</small>
                                  <small>{record.limit}</small>
                                </article>
                              ))
                          ) : (
                            <p className="empty-state">
                              Save a checked job to create evidence records.
                            </p>
                          )}
                        </div>
                      </section>
                    </>
                  )}
                  {showFollowUpQueue && (
                    <section
                      className="follow-up-workspace"
                      aria-label="Follow-up queue"
                    >
                      <div className="section-heading">
                        <p className="eyebrow">Follow-ups</p>
                        <h2>Next actions across tracked jobs</h2>
                        <p>
                          Work from the role that needs attention next. Archive
                          or reject jobs when no action is needed.
                        </p>
                      </div>
                      {followUpApplications.length ? (
                        <div className="follow-up-list">
                          {followUpApplications.map((application) => (
                            <article
                              className="follow-up-card"
                              key={application.id}
                            >
                              <div>
                                <strong>
                                  {application.roleTitle || application.title}
                                </strong>
                                <span>
                                  {application.company || "Unknown company"} /{" "}
                                  {application.status}
                                </span>
                              </div>
                              <span
                                className={`action-timing ${
                                  getNextActionTiming(application).includes(
                                    "overdue"
                                  )
                                    ? "overdue"
                                    : getNextActionTiming(application) ===
                                        "Due today"
                                      ? "due"
                                      : ""
                                }`}
                              >
                                {getNextActionTiming(application)}
                              </span>
                              <label>
                                Next action
                                <input
                                  value={application.nextAction ?? ""}
                                  onChange={(event) =>
                                    updateApplication(application.id, {
                                      nextAction: event.target.value
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Due date
                                <input
                                  type="date"
                                  value={application.nextActionDate ?? ""}
                                  onChange={(event) =>
                                    updateApplication(application.id, {
                                      nextActionDate:
                                        event.target.value || undefined
                                    })
                                  }
                                />
                              </label>
                              <div className="application-actions">
                                <a
                                  className="secondary-button"
                                  href={`/dashboard/applications/${application.id}`}
                                >
                                  Open job
                                </a>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() =>
                                    updateApplication(application.id, {
                                      nextAction: "",
                                      nextActionDate: undefined
                                    })
                                  }
                                >
                                  Clear action
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state rich-empty-state">
                          <strong>No follow-ups waiting</strong>
                          <p>
                            Add a next action from Tracked Jobs or save a role
                            from Analyse Fit.
                          </p>
                          <a
                            className="secondary-button"
                            href="/dashboard/applications"
                          >
                            Open tracked jobs
                          </a>
                        </div>
                      )}
                    </section>
                  )}
                  {applicationId && !selectedApplication ? (
                    <section className="job-detail-panel">
                      <div className="section-heading">
                        <p className="eyebrow">Application detail</p>
                        <h2>Job not found</h2>
                        <p>
                          This job is not in the local dashboard state yet. Load
                          cloud sync or return to the tracker.
                        </p>
                      </div>
                      <a
                        className="secondary-button"
                        href="/dashboard/applications"
                      >
                        Back to applications
                      </a>
                    </section>
                  ) : null}
                  {selectedApplication ? (
                    <section
                      className="job-detail-panel"
                      aria-label="Job detail"
                    >
                      <div className="job-detail-header">
                        <div>
                          <p className="eyebrow">Job Detail</p>
                          <h2>
                            {selectedApplication.roleTitle ||
                              selectedApplication.title}
                          </h2>
                          <p>
                            {selectedApplication.company || "Unknown company"} /{" "}
                            {selectedApplication.status}
                          </p>
                        </div>
                        <div
                          className={`readiness-pill ${selectedReadyStatus === "Ready to apply" ? "ready" : selectedReadyStatus === "Blocked" ? "blocked" : "needs-check"}`}
                        >
                          {selectedReadyStatus}
                        </div>
                      </div>

                      <div className="job-detail-grid">
                        <article className="panel">
                          <div className="section-heading">
                            <p className="eyebrow">Job check</p>
                            <h3>Recommendation</h3>
                          </div>
                          <dl className="summary-list">
                            <div>
                              <dt>Fit analysis</dt>
                              <dd>
                                {typeof selectedApplication.fitScore ===
                                "number" ? (
                                  <RevealMetric label="Show saved fit analysis value">
                                    {selectedApplication.fitScore}/100
                                  </RevealMetric>
                                ) : (
                                  "Not scored yet"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Recommendation</dt>
                              <dd>
                                {selectedApplication.fitDecision ??
                                  "Not analysed"}
                              </dd>
                            </div>
                            <div>
                              <dt>Writing status</dt>
                              <dd>
                                {selectedApplication.contentGate ??
                                  "Not checked"}
                              </dd>
                            </div>
                            <div>
                              <dt>Saved</dt>
                              <dd>
                                {formatDashboardDate(
                                  selectedApplication.createdAt
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Source</dt>
                              <dd>
                                {getApplicationSourceLabel(selectedApplication)}
                              </dd>
                            </div>
                            <div>
                              <dt>URL</dt>
                              <dd>{selectedApplication.url}</dd>
                            </div>
                          </dl>
                        </article>

                        <article className="panel">
                          <div className="section-heading">
                            <p className="eyebrow">Workflow</p>
                            <h3>Current action</h3>
                          </div>
                          <label>
                            Status
                            <select
                              value={selectedApplication.status}
                              onChange={(event) =>
                                updateApplication(selectedApplication.id, {
                                  status: event.target
                                    .value as ApplicationStatus
                                })
                              }
                            >
                              {applicationStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Next action
                            <input
                              value={selectedApplication.nextAction ?? ""}
                              onChange={(event) =>
                                updateApplication(selectedApplication.id, {
                                  nextAction: event.target.value
                                })
                              }
                            />
                          </label>
                          <label>
                            Due date
                            <input
                              type="date"
                              value={selectedApplication.nextActionDate ?? ""}
                              onChange={(event) =>
                                updateApplication(selectedApplication.id, {
                                  nextActionDate:
                                    event.target.value || undefined
                                })
                              }
                            />
                          </label>
                          <label>
                            Outcome learning
                            <textarea
                              value={selectedApplication.notes ?? ""}
                              onChange={(event) =>
                                updateApplication(selectedApplication.id, {
                                  notes: event.target.value
                                })
                              }
                            />
                          </label>
                        </article>
                      </div>

                      <section
                        className="ready-checklist"
                        aria-label="Ready to apply checklist"
                      >
                        <div className="section-heading">
                          <p className="eyebrow">Ready to Apply</p>
                          <h3>Checklist</h3>
                          <p>
                            Resolve blocked items before treating this job as
                            ready.
                          </p>
                        </div>
                        <div className="ready-checklist-grid">
                          {selectedReadyChecklist.map((item) => (
                            <article
                              className={`ready-check-item ${item.status}`}
                              key={item.id}
                            >
                              <span>{item.status}</span>
                              <strong>{item.label}</strong>
                              <p>{item.evidence}</p>
                              <small>{item.action}</small>
                            </article>
                          ))}
                        </div>
                      </section>

                      <div className="job-detail-grid">
                        <section className="panel">
                          <div className="section-heading">
                            <p className="eyebrow">Check details</p>
                            <h3>Saved notes for this job</h3>
                          </div>
                          <div className="evidence-record-list">
                            {selectedApplicationEvidence.length ? (
                              selectedApplicationEvidence.map((record) => (
                                <article
                                  className="evidence-record-card"
                                  key={record.id}
                                >
                                  <div>
                                    <strong>{record.checkLabel}</strong>
                                    <span>{record.status}</span>
                                  </div>
                                  <p>{record.evidenceText}</p>
                                  <small>{record.explanation}</small>
                                  <small>{record.limit}</small>
                                </article>
                              ))
                            ) : (
                              <p className="empty-state">
                                No saved check details are attached to this job
                                yet.
                              </p>
                            )}
                          </div>
                        </section>

                        <section className="panel">
                          <div className="section-heading">
                            <p className="eyebrow">Application Kit</p>
                            <h3>Saved application content</h3>
                          </div>
                          {selectedApplication.contentSnapshot ? (
                            <div className="document-snapshot">
                              <strong>Saved content snapshot</strong>
                              <p>
                                {
                                  selectedApplication.contentSnapshot
                                    .profileSummary
                                }
                              </p>
                              <small>
                                Saved{" "}
                                {new Date(
                                  selectedApplication.contentSnapshot.savedAt
                                ).toLocaleString()}
                              </small>
                            </div>
                          ) : (
                            <p className="empty-state">
                              No content snapshot is saved for this job yet.
                            </p>
                          )}
                          <div className="application-actions">
                            <a
                              className="secondary-button"
                              href="/dashboard/application-answers"
                            >
                              Write answers
                            </a>
                            <button
                              className="secondary-button"
                              disabled={
                                selectedApplication.status !== "Interview"
                              }
                              type="button"
                              onClick={() =>
                                generateInterviewPrep(selectedApplication)
                              }
                            >
                              Prep interview
                            </button>
                          </div>
                          {selectedInterviewPrepPack ? (
                            <div className="document-snapshot">
                              <strong>Interview prep ready</strong>
                              <p>{selectedInterviewPrepPack.roleSummary}</p>
                              <small>
                                <RevealMetric label="Show likely question count">
                                  {
                                    selectedInterviewPrepPack.likelyQuestions
                                      .length
                                  }{" "}
                                  likely questions saved
                                </RevealMetric>
                              </small>
                            </div>
                          ) : null}
                        </section>
                      </div>
                    </section>
                  ) : null}
                  {showApplicationList && (
                    <>
                      <section
                        className="application-command-strip"
                        aria-label="Application filters"
                      >
                        <label>
                          Search
                          <input
                            placeholder="Role, company, source, next action"
                            value={applicationSearchQuery}
                            onChange={(event) =>
                              setApplicationSearchQuery(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={applicationStatusFilter}
                            onChange={(event) =>
                              setApplicationStatusFilter(
                                event.target.value as ApplicationStatus | "all"
                              )
                            }
                          >
                            <option value="all">All statuses</option>
                            {applicationStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Outcome
                          <select
                            value={applicationOutcomeFilter}
                            onChange={(event) =>
                              setApplicationOutcomeFilter(
                                event.target.value as
                                  | ApplicationOutcomeReason
                                  | "all"
                              )
                            }
                          >
                            <option value="all">All outcomes</option>
                            {applicationOutcomeReasons.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div>
                          <strong>
                            <RevealMetric label="Show filtered application count">
                              {filteredApplications.length}
                            </RevealMetric>
                          </strong>
                          <span>
                            shown of{" "}
                            <RevealMetric label="Show total application count">
                              {state.applications.length}
                            </RevealMetric>
                          </span>
                        </div>
                      </section>
                      <div className="application-table">
                        {filteredApplications.length ? (
                          filteredApplications.map((application) => (
                            <article
                              className="application-row"
                              key={application.id}
                            >
                              <div>
                                <div className="application-row-header">
                                  <strong>
                                    {application.roleTitle || application.title}
                                  </strong>
                                  <span
                                    className={`source-mode-pill ${
                                      getApplicationCaptureMode(application)
                                        .className
                                    }`}
                                    title={
                                      getApplicationCaptureMode(application)
                                        .detail
                                    }
                                  >
                                    {
                                      getApplicationCaptureMode(application)
                                        .label
                                    }
                                  </span>
                                  <span
                                    className={`action-timing ${
                                      getNextActionTiming(application).includes(
                                        "overdue"
                                      )
                                        ? "overdue"
                                        : getNextActionTiming(application) ===
                                            "Due today"
                                          ? "due"
                                          : ""
                                    }`}
                                  >
                                    {getNextActionTiming(application)}
                                  </span>
                                </div>
                                <span>
                                  {application.company || "Unknown company"}
                                </span>
                                <div className="application-meta-strip">
                                  <span>
                                    {getApplicationSourceLabel(application)}
                                  </span>
                                  <span>
                                    Saved{" "}
                                    {formatDashboardDate(application.createdAt)}
                                  </span>
                                  <span>{application.status}</span>
                                </div>
                                <small>{application.url}</small>
                                {application.fitDecision ? (
                                  <small>
                                    Match score{" "}
                                    {typeof application.fitScore ===
                                    "number" ? (
                                      <RevealMetric label="Show application match score">
                                        {application.fitScore}/100
                                      </RevealMetric>
                                    ) : (
                                      "not scored yet"
                                    )}
                                    . Recommendation: {application.fitDecision}
                                    {application.contentGate === "stretch"
                                      ? ". Stretch role"
                                      : application.contentGate === "blocked"
                                        ? ". Blocked until risks are reviewed"
                                        : ""}
                                  </small>
                                ) : null}
                              </div>
                              <label>
                                Status
                                <select
                                  value={application.status}
                                  onChange={(event) =>
                                    updateApplication(application.id, {
                                      status: event.target
                                        .value as ApplicationStatus
                                    })
                                  }
                                >
                                  {applicationStatuses.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="application-next-action-fields">
                                <label>
                                  Next action
                                  <input
                                    value={application.nextAction ?? ""}
                                    onChange={(event) =>
                                      updateApplication(application.id, {
                                        nextAction: event.target.value
                                      })
                                    }
                                  />
                                </label>
                                <label>
                                  Due date
                                  <input
                                    type="date"
                                    value={application.nextActionDate ?? ""}
                                    onChange={(event) =>
                                      updateApplication(application.id, {
                                        nextActionDate:
                                          event.target.value || undefined
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <label>
                                Outcome
                                <select
                                  value={application.outcomeReason ?? "Unknown"}
                                  onChange={(event) =>
                                    updateApplication(application.id, {
                                      outcomeReason: event.target
                                        .value as ApplicationOutcomeReason
                                    })
                                  }
                                >
                                  {applicationOutcomeReasons.map((reason) => (
                                    <option key={reason} value={reason}>
                                      {reason}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Outcome learning
                                <input
                                  value={application.notes ?? ""}
                                  onChange={(event) =>
                                    updateApplication(application.id, {
                                      notes: event.target.value
                                    })
                                  }
                                />
                              </label>
                              <div className="application-actions">
                                <a
                                  className="secondary-button"
                                  href={`/dashboard/applications/${application.id}`}
                                >
                                  Open
                                </a>
                                <button
                                  className="secondary-button"
                                  disabled={application.status !== "Interview"}
                                  type="button"
                                  onClick={() =>
                                    generateInterviewPrep(application)
                                  }
                                >
                                  Generate Prep
                                </button>
                                <button
                                  className="danger-button"
                                  type="button"
                                  onClick={() =>
                                    deleteApplication(application.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="empty-state rich-empty-state">
                            <strong>
                              {state.applications.length
                                ? "No jobs match these filters"
                                : "No tracked jobs yet"}
                            </strong>
                            <p>
                              {state.applications.length
                                ? "Clear filters or search for another role, company or action."
                                : "Tracked roles from the extension and saved role checks appear here."}
                            </p>
                            {!state.applications.length ? (
                              <div className="empty-state-actions">
                                <a
                                  className="secondary-button"
                                  href="/dashboard/extension"
                                >
                                  Connect extension
                                </a>
                                <a
                                  className="secondary-button"
                                  href="/dashboard/match-score"
                                >
                                  Check a role
                                </a>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}

              {!isOverview && currentTab === "interview" && (
                <section className="prep-section full-width-section">
                  <div className="section-intro">
                    <p className="eyebrow">AI Interview Coach</p>
                    <h2>Prepare answers from evidence, not guesswork</h2>
                    <p>
                      AutoTime checks your rough answer against saved profile
                      evidence, job context and work-right boundaries before
                      shaping it.
                    </p>
                  </div>

                  <div className="interview-buddy-layout">
                    <section
                      className="interview-buddy-form"
                      aria-label="Interview Buddy input"
                    >
                      <div className="buddy-character-panel">
                        <span aria-hidden="true">AI</span>
                        <div>
                          <strong>Evidence-first answer coach</strong>
                          <p>
                            Start with honest notes. The coach improves
                            structure, flags missing proof and keeps your answer
                            within what you can verify.
                          </p>
                        </div>
                      </div>

                      <label>
                        Choose a question
                        <select
                          value={interviewQuestion}
                          onChange={(event) => {
                            setInterviewQuestion(event.target.value)
                            setCustomInterviewQuestion("")
                          }}
                        >
                          {interviewQuestionOptions.map((question) => (
                            <option key={question} value={question}>
                              {question}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Or type your own question
                        <input
                          placeholder="Example: Tell me about a time you handled changing requirements."
                          value={customInterviewQuestion}
                          onChange={(event) =>
                            setCustomInterviewQuestion(event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Rough draft answer
                        <textarea
                          placeholder="Write the factual version first: situation, what you did, result, and anything you must not overclaim."
                          value={interviewDraftAnswer}
                          onChange={(event) =>
                            setInterviewDraftAnswer(event.target.value)
                          }
                        />
                      </label>

                      {interviewDisclaimer ? (
                        <p className="decision-integrity-note">
                          {interviewDisclaimer}
                        </p>
                      ) : null}

                      <div className="header-actions">
                        <button
                          disabled={isCopilotThinking}
                          type="button"
                          onClick={generateInterviewBuddyAnswers}
                        >
                          {isCopilotThinking ? "Coaching..." : "Run interview coach"}
                        </button>
                        <button
                          className="secondary-button"
                          disabled={isCopilotThinking}
                          type="button"
                          onClick={generateLocalInterviewBuddyAnswers}
                        >
                          Local evidence check
                        </button>
                        <button
                          className="secondary-button"
                          disabled={!hasInterviewBuddyOutputs}
                          type="button"
                          onClick={saveFinalInterviewAnswer}
                        >
                          Save Final Answer
                        </button>
                      </div>
                    </section>

                    <section
                      className="interview-buddy-output"
                      aria-label="Interview Buddy outputs"
                    >
                      <div className="interview-coach-audit">
                        <article>
                          <span>Source</span>
                          <strong>{currentJobInputMode.label}</strong>
                          <p>{currentJobInputMode.detail}</p>
                        </article>
                        <article>
                          <span>Evidence score</span>
                          <strong>
                            <RevealMetric label="Show interview evidence score">
                              {interviewCoachMeta.evidenceScore}/100
                            </RevealMetric>
                          </strong>
                          <p>
                            {interviewCoachMeta.source === "ai"
                              ? "AI checked against your saved evidence."
                              : "Local readiness estimate before AI coaching."}
                          </p>
                        </article>
                        <article>
                          <span>Risk flags</span>
                          <strong>
                            <RevealMetric label="Show interview risk flag count">
                              {interviewCoachMeta.riskFlags.length}
                            </RevealMetric>
                          </strong>
                          <p>
                            {interviewCoachMeta.riskFlags[0] ||
                              "No obvious overclaim or work-right risk flagged yet."}
                          </p>
                        </article>
                        <article>
                          <span>Missing proof</span>
                          <strong>
                            <RevealMetric label="Show missing proof count">
                              {interviewCoachMeta.missingEvidence.length}
                            </RevealMetric>
                          </strong>
                          <p>
                            {interviewCoachMeta.missingEvidence[0] ||
                              "Enough draft evidence to shape an answer."}
                          </p>
                        </article>
                        <article>
                          <span>Evidence used</span>
                          <strong>
                            <RevealMetric label="Show interview evidence source count">
                              {
                                [
                                  state.profile.baseCvText.trim() && "CV",
                                  state.profile.experienceHighlights.trim() &&
                                    "Profile",
                                  state.jobAnalysis.jobDescription.trim() &&
                                    "JD",
                                  interviewDraftAnswer.trim() && "Draft"
                                ].filter(Boolean).length
                              }
                            </RevealMetric>
                          </strong>
                          <p>
                            Uses profile evidence, parsed/manual JD context and
                            your rough answer where available.
                          </p>
                        </article>
                      </div>

                      <article className="interview-coach-brief">
                        <strong>AutoTime boundary</strong>
                        <p>{interviewCoachMeta.boundaryNote}</p>
                      </article>

                      {(
                        [
                          ["professionalAnswer", "Boardroom version"],
                          ["naturalAnswer", "Human version"],
                          ["lightFunnyAnswer", "Warm version"],
                          ["strongFinalAnswer", "Final evidence-led answer"]
                        ] as Array<[InterviewBuddyOutputKey, string]>
                      ).map(([key, label]) => (
                        <article className="buddy-answer-card" key={key}>
                          <div>
                            <h3>{label}</h3>
                            <button
                              className="secondary-button"
                              disabled={!interviewBuddyOutputs[key]}
                              type="button"
                              onClick={() =>
                                speakInterviewAnswer(interviewBuddyOutputs[key])
                              }
                            >
                              Speak
                            </button>
                          </div>
                          <p>
                            {interviewBuddyOutputs[key] ||
                              "Run the coach to see this version."}
                          </p>
                        </article>
                      ))}

                      <article className="interview-coach-brief">
                        <strong>Follow-up drills</strong>
                        {interviewCoachMeta.followUpDrills.length ? (
                          <ul className="bullets-list">
                            {interviewCoachMeta.followUpDrills.map((drill) => (
                              <li key={drill}>{drill}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>
                            Run the coach to get targeted follow-up questions
                            and practice prompts.
                          </p>
                        )}
                      </article>
                    </section>
                  </div>

                  {showInterviewPrepPacks && (
                    <>
                      <div className="section-intro">
                        <p className="eyebrow">Saved prep packs</p>
                        <h2>Prep generated from applications</h2>
                        <p>
                          Prep packs still use saved profile, job details and
                          application status. They remain separate from
                          Interview Buddy answers.
                        </p>
                      </div>
                      <div className="prep-grid">
                        {state.interviewPrepPacks.length ? (
                          state.interviewPrepPacks.map((pack) => (
                            <article className="prep-card" key={pack.id}>
                              <h3>{pack.roleSummary}</h3>
                              <p>{pack.positioningStatement}</p>
                              <h4>STAR Prompts</h4>
                              <ul className="bullets-list">
                                {pack.starAnswerPrompts.map((prompt) => (
                                  <li key={prompt}>{prompt}</li>
                                ))}
                              </ul>
                              <h4>Likely Questions</h4>
                              <ul className="bullets-list">
                                {pack.likelyQuestions.map((question) => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ul>
                              <h4>Employer Questions</h4>
                              <ul className="bullets-list">
                                {pack.questionsToAskEmployer.map((question) => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ul>
                              <h4>Final Checklist</h4>
                              <ul className="bullets-list">
                                {pack.finalPrepChecklist.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </article>
                          ))
                        ) : (
                          <p className="empty-state">
                            Move an application to Interview, then generate a
                            prep pack.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
              </>
            </div>
          </div>
        </div>
      </div>

      <details
        id="dashboard-backups"
        aria-disabled={isDashboardProtocolLocked}
        className={
          isDashboardProtocolLocked ? "utility-bar locked" : "utility-bar"
        }
      >
        <summary>Backups</summary>
        <div className="backup-actions">
          <div className="backup-action-group">
            <span>Save</span>
            <button
              disabled={isDashboardProtocolLocked}
              type="button"
              onClick={saveDashboard}
            >
              Save changes
            </button>
          </div>
          <div className="backup-action-group">
            <span>Export</span>
            <button
              className="secondary-button"
              disabled={isDashboardProtocolLocked}
              type="button"
              onClick={exportDashboard}
            >
              Export backup
            </button>
          </div>
        </div>
        <div className="backup-import-group">
          <label className="import-control">
            Import
            <textarea
              disabled={isDashboardProtocolLocked}
              placeholder="Paste exported AutoTime backup contents"
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
            Import backup
          </button>
        </div>
      </details>
    </main>
  )
}
