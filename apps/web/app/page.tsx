"use client"

import { useEffect, useMemo, useState } from "react"
import {
  companionDashboardStateSchema,
  getCandidateProfileBridgeIssues,
  hasCandidateProfileBridgeEvidence,
  type ApplicationRecord,
  type ApplicationStatus,
  type CandidateProfile,
  type CompanionDashboardState,
  type JobAnalysisDraft,
  type ReusableAnswers
} from "shared"
import {
  canUseWebAI,
  createLocalInterviewPrepPack,
  defaultWebAISettings,
  generateAIInterviewPrepPack,
  getAIInterviewErrorMessage,
  type WebAISettings
} from "../lib/interview-prep"
import {
  getBrowserCloudSyncReadiness,
  prepareProfileSyncAction
} from "../lib/cloud-sync"

type DashboardTab = "profile" | "jobs" | "applications" | "interview"
type MetricTone = "neutral" | "good" | "warn"
type RoleMarket = "general-tech" | "fintech"
type CandidateMarketPosition = "foreign-candidate" | "native-candidate"
type CandidateUrgency = "urgent" | "active" | "exploring"

type ProductContext = {
  roleMarket: RoleMarket
  candidatePosition: CandidateMarketPosition
  urgency: CandidateUrgency
  targetCountry: string
  experienceLevel: string
}

type ContextSuggestion = ProductContext & {
  targetRoles: string
  workRightPrompt: string
  confidence: "Low" | "Medium" | "High"
  reasons: string[]
}

type DecisionBrief = {
  decision: "Apply now" | "Apply with caution" | "Improve profile first"
  confidence: "Low" | "Medium" | "High"
  score: number
  rationale: string[]
  risks: string[]
  nextActions: string[]
  missingInputs: string[]
}

const storageKey = "autotime-v2-companion-dashboard"
const aiSettingsStorageKey = "autotime-v2-ai-settings"
const productContextStorageKey = "autotime-v2-product-context"

const applicationStatuses: ApplicationStatus[] = [
  "Saved",
  "Applying",
  "Applied",
  "Interview",
  "Rejected",
  "Closed"
]

const tabLabels: Array<[DashboardTab, string]> = [
  ["profile", "Smarter Targeting"],
  ["jobs", "Stronger Applications"],
  ["applications", "Outcome Evidence"],
  ["interview", "More Interviews"]
]

const roleMarkets: Array<{
  id: RoleMarket
  label: string
  description: string
}> = [
  {
    id: "general-tech",
    label: "General tech",
    description:
      "Product, SaaS, platform, operations, support, data, analyst and delivery roles."
  },
  {
    id: "fintech",
    label: "FinTech",
    description:
      "Payments, banking, risk, compliance, resilience, operations and regulated systems roles."
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

const defaultProductContext: ProductContext = {
  roleMarket: "general-tech",
  candidatePosition: "foreign-candidate",
  urgency: "active",
  targetCountry: "United Kingdom",
  experienceLevel: "Mid-level"
}

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "",
  targetCountries: "United Kingdom, Ireland, Netherlands, Germany",
  targetRoles:
    "Business Analyst, Systems Analyst, Product Analyst, Application Support Analyst",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "Negotiable",
  baseCvText:
    "Business analyst with payments, application support, UAT, stakeholder management, SQL reporting and systems delivery experience.",
  projectSummaries:
    "Add project evidence that proves delivery, analysis, systems, data, support, product or regulated-domain impact.",
  experienceHighlights:
    "Requirements analysis, UAT coordination, stakeholder translation, operational problem solving and regulated systems documentation."
}

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "My notice period is negotiable.",
  salaryExpectationAnswer: "",
  motivationAnswer:
    "I am interested in roles where I can combine business analysis, systems thinking and delivery clarity.",
  strengthsAnswer:
    "My strengths are requirements analysis, stakeholder management, UAT and operational problem solving.",
  availabilityAnswer: ""
}

const emptyJobAnalysis: JobAnalysisDraft = {
  jobTitle: "Business Systems Analyst",
  company: "Example FinTech",
  jobUrl: "https://example.com/jobs/business-systems-analyst",
  location: "London, United Kingdom",
  workMode: "hybrid",
  jobDescription:
    "Business systems analyst role supporting payments delivery, requirements gathering, stakeholder management, UAT coordination, SQL reporting and API integration.",
  notes: "V2 dashboard local companion sample.",
  skills: [
    "Requirements analysis",
    "Stakeholder management",
    "UAT",
    "Payments",
    "SQL"
  ],
  seniority: "Mid-level",
  summary:
    "Business Systems Analyst at Example FinTech appears to be a mid-level hybrid opportunity.",
  gaps: ["Confirm sponsorship and location practicality before applying."],
  fitScore: 82,
  recommendation: "High Priority",
  positioningAngle:
    "Position around FinTech systems, application support, and cross-functional delivery.",
  scoreFactors: [
    "Role title aligns with the target analyst/systems role family.",
    "Domain language supports a FinTech or regulated-systems positioning angle.",
    "Work mode supports practical UK/EU application execution."
  ]
}

const defaultState: CompanionDashboardState = {
  profile: emptyProfile,
  reusableAnswers: emptyReusableAnswers,
  jobAnalysis: emptyJobAnalysis,
  applications: [],
  interviewPrepPacks: []
}

function getStoredState() {
  if (typeof window === "undefined") {
    return defaultState
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")
    const result = companionDashboardStateSchema.safeParse(parsed)
    return result.success ? result.data : defaultState
  } catch {
    return defaultState
  }
}

function saveState(state: CompanionDashboardState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

function getStoredAISettings() {
  if (typeof window === "undefined") {
    return defaultWebAISettings
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(aiSettingsStorageKey) ?? "null"
    ) as Partial<WebAISettings> | null

    return {
      ...defaultWebAISettings,
      ...(parsed ?? {}),
      monthlyBudgetUsd:
        typeof parsed?.monthlyBudgetUsd === "number"
          ? parsed.monthlyBudgetUsd
          : defaultWebAISettings.monthlyBudgetUsd,
      usedBudgetUsd:
        typeof parsed?.usedBudgetUsd === "number"
          ? parsed.usedBudgetUsd
          : defaultWebAISettings.usedBudgetUsd
    }
  } catch {
    return defaultWebAISettings
  }
}

function saveAISettings(settings: WebAISettings) {
  window.localStorage.setItem(aiSettingsStorageKey, JSON.stringify(settings))
}

function getStoredProductContext() {
  if (typeof window === "undefined") {
    return defaultProductContext
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(productContextStorageKey) ?? "null"
    ) as Partial<ProductContext> | null

    return {
      ...defaultProductContext,
      ...(parsed ?? {})
    }
  } catch {
    return defaultProductContext
  }
}

function saveProductContext(context: ProductContext) {
  window.localStorage.setItem(productContextStorageKey, JSON.stringify(context))
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

function createApplication(job: JobAnalysisDraft): ApplicationRecord {
  const title = job.jobTitle || "Untitled role"
  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: title,
    company: job.company || undefined,
    url: job.jobUrl,
    source: getHostname(job.jobUrl),
    createdAt: new Date().toISOString(),
    status: "Saved",
    nextAction: "Tailor application",
    nextActionDate: "",
    notes: job.positioningAngle || job.notes
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

function getReadinessScore(state: CompanionDashboardState, fitScore: number) {
  const signals = [
    state.profile.baseCvText.trim(),
    state.profile.targetRoles.trim(),
    state.profile.targetCountries.trim(),
    state.reusableAnswers.motivationAnswer.trim(),
    state.reusableAnswers.strengthsAnswer.trim(),
    state.jobAnalysis.jobDescription.trim(),
    state.jobAnalysis.positioningAngle?.trim() ?? "",
    String(state.applications.length || "")
  ]
  const completed = signals.filter(Boolean).length
  return Math.min(
    100,
    Math.round((completed / signals.length) * 70 + fitScore * 0.3)
  )
}

function getNextActionCount(applications: ApplicationRecord[]) {
  return applications.filter(
    (application) =>
      application.status !== "Closed" &&
      application.status !== "Rejected" &&
      (application.nextAction?.trim() || application.status === "Saved")
  ).length
}

function getRiskLabel(state: CompanionDashboardState) {
  if (!state.profile.workRightDetails.trim()) {
    return "Work-right evidence missing"
  }

  if ((state.jobAnalysis.gaps?.length ?? 0) > 0) {
    return `${state.jobAnalysis.gaps?.length} role risk${state.jobAnalysis.gaps?.length === 1 ? "" : "s"}`
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

function getCountryGuidance(context: ProductContext) {
  const country = context.targetCountry || "selected country"

  if (context.candidatePosition === "foreign-candidate") {
    return `For ${country}, AutoTime should check work-right clarity, sponsorship language, relocation practicality, timezone/location fit, and whether the role is worth applying before spending effort.`
  }

  return `For ${country}, AutoTime should focus on local credibility, salary/notice-period consistency, role seniority, domain fit, and interview conversion.`
}

function getMarketPositioning(context: ProductContext) {
  if (context.roleMarket === "fintech") {
    return "Position around payments, financial systems, risk, controls, operational resilience, compliance awareness, stakeholder clarity and reliable delivery."
  }

  return "Position around product/system understanding, requirements clarity, user and stakeholder impact, delivery evidence, tooling fluency and measurable outcomes."
}

function getUrgencyGuidance(context: ProductContext) {
  if (context.urgency === "urgent") {
    return "Prioritise roles with strong fit, clear work-right path and fast application execution. Avoid low-fit speculative applications."
  }

  if (context.urgency === "exploring") {
    return "Use the dashboard to compare markets, learn role language and build a stronger evidence bank before applying heavily."
  }

  return "Balance targeted applications with quality. Track next actions and improve positioning after each outcome."
}

function getAIUseCases(context: ProductContext) {
  return [
    {
      title: "Classify the role",
      body: `Decide if this is ${getMarketLabel(context)} aligned, too senior, too junior, or a poor country/work-right fit.`
    },
    {
      title: "Clarify positioning",
      body: getMarketPositioning(context)
    },
    {
      title: "Reduce wasted effort",
      body: getUrgencyGuidance(context)
    },
    {
      title: "Prepare interviews",
      body: "Turn saved role evidence into likely questions, STAR prompts, risk checks and employer questions without inventing experience."
    }
  ]
}

function includesAny(value: string, words: string[]) {
  const text = value.toLowerCase()
  return words.some((word) => text.includes(word.toLowerCase()))
}

function inferContextFromResume(
  resumeText: string,
  current: ProductContext
): ContextSuggestion {
  const words = resumeText.trim().split(/\s+/).filter(Boolean)
  const roleMarket = includesAny(resumeText, [
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
  ])
    ? "fintech"
    : current.roleMarket
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
    targetRoles:
      targetRoles ||
      (roleMarket === "fintech"
        ? "Business Analyst, Technical Business Analyst, Payments Analyst, Application Support Analyst"
        : "Business Analyst, Systems Analyst, Product Analyst, Data Analyst, Application Support Analyst"),
    workRightPrompt:
      candidatePosition === "foreign-candidate"
        ? "Confirm visa/work-right status, sponsorship need, relocation timing and eligible countries before applying."
        : "Confirm local work-right status, notice period, salary expectations and availability before applying.",
    confidence:
      words.length > 120 ? "High" : words.length > 50 ? "Medium" : "Low",
    reasons: [
      roleMarket === "fintech"
        ? "Detected FinTech, payments, banking, risk, compliance or resilience language."
        : "Detected a broader general-tech profile or no strong FinTech signal.",
      candidatePosition === "foreign-candidate"
        ? "Detected visa, sponsorship, work permit or relocation language."
        : "No strong visa or relocation signal was detected; user approval is still required.",
      `Suggested experience level: ${experienceLevel}.`
    ]
  }
}

function getDecisionBrief({
  context,
  state,
  fitScore,
  readinessScore
}: {
  context: ProductContext
  state: CompanionDashboardState
  fitScore: number
  readinessScore: number
}): DecisionBrief {
  const missingInputs = [
    !state.profile.fullName.trim() && "candidate name",
    !state.profile.baseCvText.trim() && "CV evidence",
    !state.profile.workRightDetails.trim() && "work-right details",
    !state.profile.targetRoles.trim() && "target roles",
    !state.jobAnalysis.jobDescription.trim() && "job description",
    !state.jobAnalysis.jobUrl.trim() && "job URL"
  ].filter(Boolean) as string[]
  const risks = [
    context.candidatePosition === "foreign-candidate" &&
      !state.profile.workRightDetails.trim() &&
      "Work-right, visa, sponsorship or relocation details are not confirmed.",
    !state.profile.baseCvText.trim() &&
      "CV evidence is missing, so AI positioning will be weaker.",
    !state.jobAnalysis.jobDescription.trim() &&
      "Job description is missing, so role classification is incomplete.",
    (state.jobAnalysis.gaps?.length ?? 0) > 0 &&
      `${state.jobAnalysis.gaps?.length} saved role gap${
        state.jobAnalysis.gaps?.length === 1 ? "" : "s"
      } need review.`
  ].filter(Boolean) as string[]

  const decision =
    fitScore >= 80 && readinessScore >= 70 && risks.length <= 1
      ? "Apply now"
      : fitScore >= 60 && readinessScore >= 50
        ? "Apply with caution"
        : "Improve profile first"

  return {
    decision,
    confidence:
      readinessScore >= 80 ? "High" : readinessScore >= 55 ? "Medium" : "Low",
    score: Math.round(fitScore * 0.55 + readinessScore * 0.45),
    rationale: [
      `${getMarketLabel(context)} mode is active for ${context.targetCountry}.`,
      `Current fit score is ${fitScore}% and readiness is ${readinessScore}%.`,
      getMarketPositioning(context),
      getUrgencyGuidance(context)
    ],
    risks:
      risks.length > 0
        ? risks
        : [
            "No critical risk is visible from the saved profile and job context."
          ],
    nextActions:
      decision === "Apply now"
        ? [
            "Save the role into Outcome Evidence.",
            "Tailor the application content against the saved job description.",
            "Track next action and prepare interview prompts if shortlisted."
          ]
        : decision === "Apply with caution"
          ? [
              "Clarify the highest-risk country or work-right detail.",
              "Add stronger CV evidence before generating final content.",
              "Apply only if the role is strategically important."
            ]
          : [
              "Paste CV/resume text and approve the suggested context.",
              "Add target country, target roles and work-right details.",
              "Paste a real job description before deciding."
            ],
    missingInputs
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("profile")
  const [state, setState] = useState<CompanionDashboardState>(defaultState)
  const [importJson, setImportJson] = useState("")
  const [status, setStatus] = useState("")
  const [aiSettings, setAISettings] =
    useState<WebAISettings>(defaultWebAISettings)
  const [productContext, setProductContext] = useState<ProductContext>(
    defaultProductContext
  )
  const [resumeIntake, setResumeIntake] = useState("")
  const [contextSuggestion, setContextSuggestion] =
    useState<ContextSuggestion | null>(null)
  const fitScore = useMemo(
    () => getFitScore(state.profile, state.jobAnalysis),
    [state.profile, state.jobAnalysis]
  )
  const readinessScore = useMemo(
    () => getReadinessScore(state, fitScore),
    [state, fitScore]
  )
  const statusCounts = useMemo(
    () => getStatusCounts(state.applications),
    [state.applications]
  )
  const activeActionCount = useMemo(
    () => getNextActionCount(state.applications),
    [state.applications]
  )
  const riskLabel = useMemo(() => getRiskLabel(state), [state])
  const decisionBrief = useMemo(
    () =>
      getDecisionBrief({
        context: productContext,
        state,
        fitScore,
        readinessScore
      }),
    [productContext, state, fitScore, readinessScore]
  )
  const profileBridgeIssues = useMemo(
    () => getCandidateProfileBridgeIssues(state.profile),
    [state.profile]
  )
  const profileBridgeReady = useMemo(
    () => hasCandidateProfileBridgeEvidence(state.profile),
    [state.profile]
  )
  const cloudSyncReadiness = useMemo(() => getBrowserCloudSyncReadiness(), [])
  const interviewApplications = state.applications.filter(
    (application) => application.status === "Interview"
  )

  useEffect(() => {
    setState(getStoredState())
    setAISettings(getStoredAISettings())
    setProductContext(getStoredProductContext())
  }, [])

  const persist = (next: CompanionDashboardState, message: string) => {
    setState(next)
    saveState(next)
    setStatus(message)
    setTimeout(() => setStatus(""), 3000)
  }

  const updateProfile = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value }
    }))
  }

  const updateJob = <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => {
    setState((current) => ({
      ...current,
      jobAnalysis: { ...current.jobAnalysis, [key]: value }
    }))
  }

  const updateAISetting = <K extends keyof WebAISettings>(
    key: K,
    value: WebAISettings[K]
  ) => {
    setAISettings((current) => ({ ...current, [key]: value }))
  }

  const updateProductContext = <K extends keyof ProductContext>(
    key: K,
    value: ProductContext[K]
  ) => {
    setProductContext((current) => {
      const next = { ...current, [key]: value }
      saveProductContext(next)
      return next
    })
  }

  const applyMarketContextToProfile = () => {
    const targetRoles =
      productContext.roleMarket === "fintech"
        ? "Business Analyst, Technical Business Analyst, Application Support Analyst, Payments Analyst, Operational Resilience Analyst"
        : "Business Analyst, Systems Analyst, Product Analyst, Data Analyst, Application Support Analyst"

    persist(
      {
        ...state,
        profile: {
          ...state.profile,
          targetCountries: productContext.targetCountry,
          targetRoles,
          relocationWillingness:
            productContext.candidatePosition === "foreign-candidate"
              ? "depends"
              : state.profile.relocationWillingness,
          workRightDetails:
            state.profile.workRightDetails ||
            (productContext.candidatePosition === "foreign-candidate"
              ? `Add current visa/work-right status for ${productContext.targetCountry}, sponsorship needs, relocation timing and location constraints.`
              : `Add current work-right status, notice period, salary expectations and local availability for ${productContext.targetCountry}.`)
        },
        jobAnalysis: {
          ...state.jobAnalysis,
          seniority: productContext.experienceLevel,
          positioningAngle: getMarketPositioning(productContext),
          notes: [
            state.jobAnalysis.notes,
            `Candidate market context: ${getMarketLabel(productContext)} / ${
              productContext.candidatePosition === "foreign-candidate"
                ? "foreign or relocating"
                : "native or local"
            } / ${productContext.targetCountry} / ${productContext.urgency}.`
          ]
            .filter(Boolean)
            .join("\n")
        }
      },
      "Market context applied to profile and role intelligence"
    )
  }

  const reviewResumeForContext = () => {
    if (!resumeIntake.trim()) {
      setStatus("Paste CV or resume text before reviewing candidate context")
      setTimeout(() => setStatus(""), 3000)
      return
    }

    setContextSuggestion(inferContextFromResume(resumeIntake, productContext))
  }

  const approveContextSuggestion = () => {
    if (!contextSuggestion) {
      return
    }

    saveProductContext({
      roleMarket: contextSuggestion.roleMarket,
      candidatePosition: contextSuggestion.candidatePosition,
      urgency: contextSuggestion.urgency,
      targetCountry: contextSuggestion.targetCountry,
      experienceLevel: contextSuggestion.experienceLevel
    })
    setProductContext(contextSuggestion)
    persist(
      {
        ...state,
        profile: {
          ...state.profile,
          baseCvText: resumeIntake || state.profile.baseCvText,
          targetCountries: contextSuggestion.targetCountry,
          targetRoles: contextSuggestion.targetRoles,
          workRightDetails:
            state.profile.workRightDetails || contextSuggestion.workRightPrompt
        },
        jobAnalysis: {
          ...state.jobAnalysis,
          seniority: contextSuggestion.experienceLevel,
          positioningAngle: getMarketPositioning(contextSuggestion)
        }
      },
      "Approved CV context applied"
    )
  }

  const saveDashboard = () => {
    persist(state, "Dashboard saved locally")
  }

  const saveApplicationFromJob = () => {
    if (!state.jobAnalysis.jobUrl.trim()) {
      setStatus("Add a job URL before saving an application")
      return
    }

    const application = createApplication({
      ...state.jobAnalysis,
      fitScore
    })
    persist(
      {
        ...state,
        applications: [application, ...state.applications]
      },
      "Application saved to dashboard"
    )
    setActiveTab("applications")
  }

  const updateApplication = (
    id: string,
    changes: Partial<ApplicationRecord>
  ) => {
    persist(
      {
        ...state,
        applications: state.applications.map((application) =>
          application.id === id ? { ...application, ...changes } : application
        )
      },
      "Application updated"
    )
  }

  const saveWebAISettings = () => {
    saveAISettings(aiSettings)
    setStatus("AI settings saved locally")
    setTimeout(() => setStatus(""), 3000)
  }

  const clearWebAISettings = () => {
    setAISettings(defaultWebAISettings)
    saveAISettings(defaultWebAISettings)
    setStatus("AI settings cleared")
    setTimeout(() => setStatus(""), 3000)
  }

  const saveInterviewPrepPack = (
    pack: CompanionDashboardState["interviewPrepPacks"][number],
    message: string,
    nextAISettings = aiSettings
  ) => {
    persist(
      {
        ...state,
        interviewPrepPacks: [
          pack,
          ...state.interviewPrepPacks.filter(
            (current) => current.applicationId !== pack.applicationId
          )
        ]
      },
      message
    )
    setAISettings(nextAISettings)
    saveAISettings(nextAISettings)
    setActiveTab("interview")
  }

  const generateInterviewPrep = (application: ApplicationRecord) => {
    const pack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )
    saveInterviewPrepPack(pack, "Interview prep pack generated")
  }

  const generateAIInterviewPrep = async (application: ApplicationRecord) => {
    const fallbackPack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )

    if (!canUseWebAI(aiSettings)) {
      saveInterviewPrepPack(
        fallbackPack,
        "AI interview prep skipped: add an API key or raise the local budget. Used local fallback."
      )
      return
    }

    try {
      const aiPrep = await generateAIInterviewPrepPack({
        settings: aiSettings,
        application,
        profile: state.profile,
        reusableAnswers: state.reusableAnswers,
        job: state.jobAnalysis,
        fallbackPack
      })
      const nextAISettings = {
        ...aiSettings,
        usedBudgetUsd: Number(
          (aiSettings.usedBudgetUsd + aiPrep.approximateCostUsd).toFixed(6)
        )
      }

      saveInterviewPrepPack(
        aiPrep.value,
        `AI interview prep pack generated. Estimated cost: $${aiPrep.approximateCostUsd.toFixed(
          6
        )}`,
        nextAISettings
      )
    } catch (error) {
      saveInterviewPrepPack(
        fallbackPack,
        `AI interview prep failed: ${getAIInterviewErrorMessage(
          error
        )} Used local fallback.`
      )
    }
  }

  const exportDashboard = () => {
    if (!profileBridgeReady) {
      setStatus(
        `Complete mandatory candidate profile bridge first: ${profileBridgeIssues.join(
          ", "
        )}`
      )
      setActiveTab("profile")
      return
    }

    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-v2-dashboard.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importDashboard = (value: string) => {
    if (!value.trim()) {
      setStatus("Paste exported V2 dashboard JSON before importing")
      return
    }

    try {
      const parsed = JSON.parse(value)
      const result = companionDashboardStateSchema.safeParse(parsed)

      if (!result.success) {
        setStatus("Import failed: dashboard JSON does not match V2 schema")
        return
      }

      const importedProfileIssues = getCandidateProfileBridgeIssues(
        result.data.profile
      )
      if (importedProfileIssues.length > 0) {
        setStatus(
          `Import blocked: candidate profile bridge missing ${importedProfileIssues.join(
            ", "
          )}`
        )
        return
      }

      persist(result.data, "Dashboard imported")
      setImportJson("")
    } catch {
      setStatus("Import failed: invalid JSON")
    }
  }

  const explainCloudSyncTrack = () => {
    setStatus(
      cloudSyncReadiness.configured
        ? "Cloud sync env is ready for auth wiring, but profile upload remains blocked until Supabase auth, RLS and delete controls are validated."
        : `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
    )
  }

  const explainAccountSync = () => {
    const action = prepareProfileSyncAction({
      readiness: cloudSyncReadiness,
      session: {
        checked: false,
        authenticated: false,
        userEmail: null,
        message: "Session check is not active in local-first MVP mode."
      },
      profile: state.profile,
      explicitUserAction: true
    })

    setStatus(action.message)
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">AutoTime EU Apply</p>
          <h1>Smarter targeting. Stronger applications. More interviews.</h1>
          <p>
            A UK/EU tech job application workspace that helps candidates target
            realistic roles, strengthen positioning, reduce wasted effort, and
            track which countries, sources and role families create interview
            signal.
          </p>
          <div
            className="header-actions"
            aria-label="Primary dashboard actions"
          >
            <button type="button" onClick={saveApplicationFromJob}>
              Save Job Decision
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={exportDashboard}
            >
              Export Validation Evidence
            </button>
          </div>
        </div>
        <div className="executive-panel" aria-label="Current operating summary">
          <div>
            <small>Application Strength</small>
            <strong>{readinessScore}%</strong>
          </div>
          <div>
            <small>Targeting Fit</small>
            <strong>{fitScore}%</strong>
          </div>
          <p>{state.jobAnalysis.recommendation || "Qualification pending"}</p>
        </div>
      </header>

      <section
        className="market-context-panel"
        aria-label="Candidate market context"
      >
        <div className="section-intro">
          <p className="eyebrow">Smarter Targeting</p>
          <h2>Which country, work-right path and role family should be prioritised?</h2>
          <p>
            AutoTime turns country choice, candidate status, sponsorship risk,
            domain and role family into a targeting decision before the user
            spends effort on a UK/EU application.
          </p>
        </div>

        <div className="context-grid">
          <fieldset className="segmented-field">
            <legend>Target role lane</legend>
            <div className="segmented-options">
              {roleMarkets.map((market) => (
                <button
                  aria-pressed={productContext.roleMarket === market.id}
                  className={
                    productContext.roleMarket === market.id
                      ? "segment-button active"
                      : "segment-button"
                  }
                  key={market.id}
                  type="button"
                  onClick={() => updateProductContext("roleMarket", market.id)}
                >
                  <strong>{market.label}</strong>
                  <span>{market.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="segmented-field">
            <legend>Work-right position</legend>
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
                    updateProductContext("candidatePosition", position.id)
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
                  updateProductContext("targetCountry", event.target.value)
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
                  updateProductContext("experienceLevel", event.target.value)
                }
              >
                <option value="Entry-level">Entry-level</option>
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </label>
            <label>
              Application pace
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
            <button type="button" onClick={applyMarketContextToProfile}>
              Apply Targeting Context
            </button>
          </div>
        </div>

        <div
          className="ai-use-case-grid"
          aria-label="UK/EU decision checks"
        >
          {getAIUseCases(productContext).map((useCase) => (
            <article key={useCase.title}>
              <h3>{useCase.title}</h3>
              <p>{useCase.body}</p>
            </article>
          ))}
        </div>

        <section className="resume-intake-panel" aria-label="CV context review">
          <div className="section-heading">
            <p className="eyebrow">Stronger Applications</p>
            <h2>Paste CV evidence to strengthen positioning</h2>
            <p>
              AutoTime can suggest work-right position, seniority and target
              role lanes from a CV, but the user approves every change before it
              affects role targeting or application wording.
            </p>
          </div>
          <label>
            CV / role evidence text
            <textarea
              placeholder="Paste CV, resume, or profile summary. AutoTime suggests UK/EU targeting and positioning only; it will not overwrite your profile without approval."
              value={resumeIntake}
              onChange={(event) => setResumeIntake(event.target.value)}
            />
          </label>
          <div className="header-actions">
            <button type="button" onClick={reviewResumeForContext}>
              Review Positioning Fit
            </button>
            <button
              className="secondary-button"
              disabled={!contextSuggestion}
              type="button"
              onClick={approveContextSuggestion}
            >
              Approve Target Lane
            </button>
          </div>
          {contextSuggestion && (
            <article className="suggestion-card">
              <div>
                <span>{contextSuggestion.confidence}</span>
                <small>suggestion confidence</small>
              </div>
              <dl>
                <div>
                  <dt>Work-right position</dt>
                  <dd>
                    {contextSuggestion.candidatePosition === "foreign-candidate"
                      ? "Foreign / relocating"
                      : "Native / local"}
                  </dd>
                </div>
                <div>
                  <dt>Target role lane</dt>
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

        <p className="context-guidance">{getCountryGuidance(productContext)}</p>
      </section>

      <section
        className="decision-brief-panel"
        aria-label="UK/EU apply decision brief"
      >
        <div>
          <p className="eyebrow">Stronger Applications</p>
          <h2>Apply, pause, or improve positioning?</h2>
          <p>
            AutoTime turns country context, work-right clarity, CV evidence and
            role fit into a user-reviewable decision so applications are more
            targeted, more truthful and better positioned.
          </p>
        </div>
        <div className="decision-score">
          <strong>{decisionBrief.score}%</strong>
          <span>{decisionBrief.decision}</span>
          <small>{decisionBrief.confidence} confidence</small>
        </div>
        <div className="decision-columns">
          <section>
            <h3>Targeting reason</h3>
            <ul className="bullets-list">
              {decisionBrief.rationale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>UK/EU risks</h3>
            <ul className="bullets-list">
              {decisionBrief.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Positioning gaps</h3>
            {decisionBrief.missingInputs.length ? (
              <ul className="bullets-list">
                {decisionBrief.missingInputs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Core decision inputs are present.</p>
            )}
          </section>
          <section>
            <h3>Founder next steps</h3>
            <ul className="bullets-list">
              {decisionBrief.nextActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <nav className="tab-bar" aria-label="Dashboard sections">
        {tabLabels.map(([id, label]) => (
          <button
            aria-pressed={activeTab === id}
            className={activeTab === id ? "tab-button active" : "tab-button"}
            key={id}
            type="button"
            onClick={() => setActiveTab(id as DashboardTab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {status && <p className="status-banner">{status}</p>}

      <section
        className={
          profileBridgeReady
            ? "profile-bridge-panel ready"
            : "profile-bridge-panel blocked"
        }
        aria-label="Mandatory candidate profile bridge"
      >
        <div>
          <p className="eyebrow">Mandatory MVP Profile Bridge</p>
          <h2>
            {profileBridgeReady
              ? "Candidate profile is connected to targeting"
              : "Candidate profile must be completed before market-ready use"}
          </h2>
          <p>
            The dashboard decision layer depends on the same candidate profile
            used by the Chrome extension. Export/import is the mandatory MVP
            bridge until account sync is added later.
          </p>
        </div>
        {profileBridgeReady ? (
          <ul className="bullets-list">
            <li>Profile evidence can drive targeting fit and apply decisions.</li>
            <li>Work-right and country context can be used in interview prep.</li>
            <li>Application evidence export is enabled.</li>
          </ul>
        ) : (
          <ul className="bullets-list">
            {profileBridgeIssues.map((issue) => (
              <li key={issue}>Add {issue}</li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={
          cloudSyncReadiness.configured
            ? "cloud-sync-panel flagged"
            : "cloud-sync-panel local"
        }
        aria-label="Production cloud sync track"
      >
        <div>
          <p className="eyebrow">Production Sync Track</p>
          <h2>
            {cloudSyncReadiness.configured
              ? "Cloud sync env is ready for auth wiring"
              : "Local mode stays active for founder validation"}
          </h2>
          <p>
            The production track will sync the candidate profile across the
            extension and dashboard after Supabase auth, row-level security,
            consent, and data deletion controls are verified.
          </p>
        </div>
        <div className="sync-status-grid">
          <div>
            <strong>{cloudSyncReadiness.modeLabel}</strong>
            <span>Current mode</span>
          </div>
          <div>
            <strong>{cloudSyncReadiness.accountLabel}</strong>
            <span>Account shell</span>
          </div>
          <div>
            <strong>{cloudSyncReadiness.sessionLabel}</strong>
            <span>Auth session</span>
          </div>
          <div>
            <strong>{cloudSyncReadiness.firstSliceLabel}</strong>
            <span>First sync slice</span>
          </div>
          <div>
            <strong>{cloudSyncReadiness.safetyLabel}</strong>
            <span>Safety rule</span>
          </div>
        </div>
        <div className="sync-action-stack">
          <button
            className="secondary-button"
            type="button"
            onClick={explainCloudSyncTrack}
          >
            Review Cloud Sync Status
          </button>
          <button
            disabled={!cloudSyncReadiness.configured}
            type="button"
            onClick={explainAccountSync}
          >
            {cloudSyncReadiness.syncActionLabel}
          </button>
        </div>
      </section>

      <section
        className="metrics-strip"
        aria-label="UK/EU application evidence metrics"
      >
        <div
          className={`metric-card ${getMetricTone(state.applications.length, 3)}`}
        >
          <span>{state.applications.length}</span>
          <small>Targeted roles</small>
          <p>
            {statusCounts.Applied + statusCounts.Interview} progressed beyond
            saved into evidence
          </p>
        </div>
        <div
          className={`metric-card ${getMetricTone(interviewApplications.length, 1)}`}
        >
          <span>{interviewApplications.length}</span>
          <small>Interview signal</small>
          <p>
            {state.interviewPrepPacks.length} prep pack
            {state.interviewPrepPacks.length === 1 ? "" : "s"} ready
          </p>
        </div>
        <div
          className={`metric-card ${activeActionCount > 0 ? "neutral" : "warn"}`}
        >
          <span>{activeActionCount}</span>
          <small>Application actions</small>
          <p>Next steps tracked across live UK/EU roles</p>
        </div>
        <div className="metric-card warn">
          <span>{state.jobAnalysis.skills?.length ?? 0}</span>
          <small>Positioning evidence</small>
          <p>{riskLabel}</p>
        </div>
      </section>

      <section className="readiness-roadmap" aria-label="Readiness roadmap">
        <div className="section-intro">
          <p className="eyebrow">Apply Smarter Path</p>
          <h2>What must be true before spending effort on this application?</h2>
        </div>
        {[
          {
            title: "1. Confirm identity and market",
            done:
              Boolean(state.profile.targetRoles.trim()) &&
              Boolean(productContext.targetCountry),
            body:
              productContext.candidatePosition === "foreign-candidate"
                ? "Candidate type, target country and role family should be approved before applying."
                : "Local status, role family and country market should be explicit before applying."
          },
          {
            title: "2. Prove fit with evidence",
            done: Boolean(state.profile.baseCvText.trim()),
            body: "CV evidence should support the role family, seniority, skills and market positioning."
          },
          {
            title: "3. Check country and work-right risk",
            done: Boolean(state.profile.workRightDetails.trim()),
            body: "Work rights, sponsorship, relocation, salary and notice period should be clear enough to avoid wasted effort."
          },
          {
            title: "4. Decide apply or skip",
            done: Boolean(state.jobAnalysis.jobDescription.trim()),
            body: "A real job description lets AutoTime classify fit, risks and next actions before the user commits effort."
          }
        ].map((step) => (
          <article
            className={step.done ? "roadmap-step done" : "roadmap-step"}
            key={step.title}
          >
            <span>{step.done ? "Ready" : "Needed"}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      {activeTab === "profile" && (
        <section className="workspace-grid">
          <div className="input-column">
            <label>
              Full name
              <input
                value={state.profile.fullName}
                onChange={(event) =>
                  updateProfile("fullName", event.target.value)
                }
              />
            </label>
            <label>
              Current country
              <input
                value={state.profile.currentCountry}
                onChange={(event) =>
                  updateProfile("currentCountry", event.target.value)
                }
              />
            </label>
            <label>
              Current city
              <input
                value={state.profile.currentCity}
                onChange={(event) =>
                  updateProfile("currentCity", event.target.value)
                }
              />
            </label>
            <label>
              Target countries
              <input
                value={state.profile.targetCountries}
                onChange={(event) =>
                  updateProfile("targetCountries", event.target.value)
                }
              />
            </label>
            <label>
              Target roles
              <input
                value={state.profile.targetRoles}
                onChange={(event) =>
                  updateProfile("targetRoles", event.target.value)
                }
              />
            </label>
            <label>
              Work-right details
              <textarea
                value={state.profile.workRightDetails}
                onChange={(event) =>
                  updateProfile("workRightDetails", event.target.value)
                }
              />
            </label>
            <label>
              Base CV evidence
              <textarea
                value={state.profile.baseCvText}
                onChange={(event) =>
                  updateProfile("baseCvText", event.target.value)
                }
              />
            </label>
          </div>

          <div className="output-column">
            <section className="panel">
              <div className="section-heading">
                <p className="eyebrow">Smarter Targeting Record</p>
                <h2>Candidate Fit For UK/EU Roles</h2>
              </div>
              <dl className="summary-list">
                <div>
                  <dt>Current location</dt>
                  <dd>
                    {[state.profile.currentCity, state.profile.currentCountry]
                      .filter(Boolean)
                      .join(", ") || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt>Relocation</dt>
                  <dd>{state.profile.relocationWillingness}</dd>
                </div>
                <div>
                  <dt>Notice period</dt>
                  <dd>{state.profile.noticePeriod || "Not set"}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <div className="section-heading">
                <p className="eyebrow">Stronger Application Wording</p>
                <h2>Reusable UK/EU Answers</h2>
              </div>
              <label>
                Motivation answer
                <textarea
                  value={state.reusableAnswers.motivationAnswer}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reusableAnswers: {
                        ...current.reusableAnswers,
                        motivationAnswer: event.target.value
                      }
                    }))
                  }
                />
              </label>
              <label>
                Strengths answer
                <textarea
                  value={state.reusableAnswers.strengthsAnswer}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reusableAnswers: {
                        ...current.reusableAnswers,
                        strengthsAnswer: event.target.value
                      }
                    }))
                  }
                />
              </label>
            </section>
          </div>
        </section>
      )}

      {activeTab === "jobs" && (
        <section className="workspace-grid">
          <div className="input-column">
            <label>
              Job title
              <input
                value={state.jobAnalysis.jobTitle}
                onChange={(event) => updateJob("jobTitle", event.target.value)}
              />
            </label>
            <label>
              Company
              <input
                value={state.jobAnalysis.company}
                onChange={(event) => updateJob("company", event.target.value)}
              />
            </label>
            <label>
              Job URL
              <input
                value={state.jobAnalysis.jobUrl}
                onChange={(event) => updateJob("jobUrl", event.target.value)}
              />
            </label>
            <label>
              Job description
              <textarea
                value={state.jobAnalysis.jobDescription}
                onChange={(event) =>
                  updateJob("jobDescription", event.target.value)
                }
              />
            </label>
            <button type="button" onClick={saveApplicationFromJob}>
              Save Job Decision
            </button>
          </div>

          <div className="output-column">
            <section className="panel">
              <div className="section-heading">
                <p className="eyebrow">Smarter Targeting Brief</p>
                <h2>Role Fit And Positioning Evidence</h2>
              </div>
              <p className="large-copy">
                {state.jobAnalysis.positioningAngle ||
                  "Add job details to create a UK/EU positioning angle."}
              </p>
              <ul className="bullets-list">
                {(state.jobAnalysis.scoreFactors?.length
                  ? state.jobAnalysis.scoreFactors
                  : ["No score factors saved yet."]
                ).map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </section>
            <section className="panel">
              <div className="section-heading">
                <p className="eyebrow">Evidence Map</p>
                <h2>Skills, Country Fit And Gaps</h2>
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

      {activeTab === "applications" && (
        <section className="applications-section full-width-section">
          <div className="section-intro">
            <p className="eyebrow">More Interviews Evidence</p>
            <h2>UK/EU Application Outcome Tracker</h2>
            <p>
              Track each real role with country, source, next action, outcome
              notes and interview signal, so the pilot measures whether smarter
              targeting and stronger applications create more interviews.
            </p>
          </div>
          <div
            className="pipeline-summary"
            aria-label="Application status counts"
          >
            {applicationStatuses.map((status) => (
              <div key={status}>
                <span>{statusCounts[status]}</span>
                <small>{status}</small>
              </div>
            ))}
          </div>
          <div className="application-table">
            {state.applications.length ? (
              state.applications.map((application) => (
                <article className="application-row" key={application.id}>
                  <div>
                    <strong>
                      {application.roleTitle || application.title}
                    </strong>
                    <span>{application.company || "Unknown company"}</span>
                    <small>{application.url}</small>
                  </div>
                  <label>
                    Status
                    <select
                      value={application.status}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          status: event.target.value as ApplicationStatus
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
                      value={application.nextAction ?? ""}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          nextAction: event.target.value
                        })
                      }
                    />
                  </label>
                  <div className="application-actions">
                    <button
                      className="secondary-button"
                      disabled={application.status !== "Interview"}
                      type="button"
                      onClick={() => generateInterviewPrep(application)}
                    >
                      Generate Prep
                    </button>
                    {aiSettings.apiKey.trim() && (
                      <button
                        disabled={
                          application.status !== "Interview" ||
                          !canUseWebAI(aiSettings)
                        }
                        type="button"
                        onClick={() =>
                          void generateAIInterviewPrep(application)
                        }
                      >
                        Generate AI Prep
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state rich-empty-state">
                <strong>No UK/EU roles captured yet</strong>
                <p>
                  Use Stronger Applications to qualify a live vacancy, then save it
                  with a next action and outcome note.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "interview" && (
        <section className="prep-section full-width-section">
          <div className="section-intro">
            <p className="eyebrow">More Interviews</p>
            <h2>Role-Specific Interview Conversion Prep</h2>
            <p>
              Prep packs use the saved country context, role evidence,
              application state and positioning angle; they do not invent
              experience.
            </p>
          </div>
          <section
            className="ai-settings-panel"
            aria-label="AI interview settings"
          >
            <div>
              <h3>Controlled-Cost Prep Settings</h3>
              <p>
                Optional browser-local OpenAI settings for interview prep only.
                Leave the key empty to use local prep without storing secrets on
                an AutoTime server.
              </p>
            </div>
            <label>
              OpenAI API key
              <input
                type="password"
                value={aiSettings.apiKey}
                onChange={(event) =>
                  updateAISetting("apiKey", event.target.value)
                }
              />
            </label>
            <label>
              Model
              <select
                value={aiSettings.model}
                onChange={(event) =>
                  updateAISetting("model", event.target.value)
                }
              >
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </label>
            <label>
              Monthly budget USD
              <input
                min="0"
                step="0.01"
                type="number"
                value={aiSettings.monthlyBudgetUsd}
                onChange={(event) =>
                  updateAISetting(
                    "monthlyBudgetUsd",
                    Number(event.target.value)
                  )
                }
              />
            </label>
            <div className="ai-budget-summary">
              <span>${aiSettings.usedBudgetUsd.toFixed(6)}</span>
              <small>estimated prep spend in this browser</small>
            </div>
            <div className="application-actions">
              <button type="button" onClick={saveWebAISettings}>
                Save AI Settings
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={clearWebAISettings}
              >
                Clear AI Settings
              </button>
            </div>
          </section>
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
                Move an application to Interview, then generate a prep pack.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="utility-bar">
        <button type="button" onClick={saveDashboard}>
          Save Local Application Evidence
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={exportDashboard}
        >
          Export Application Evidence
        </button>
        <label className="import-control">
          Import Application Evidence
          <textarea
            placeholder="Paste exported AutoTime dashboard evidence JSON"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => importDashboard(importJson)}
        >
          Import Evidence
        </button>
      </section>
    </main>
  )
}
