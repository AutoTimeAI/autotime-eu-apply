"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import {
  companionDashboardStateSchema,
  evaluateCountryFit,
  getCandidateProfileBridgeIssues,
  hasCandidateProfileBridgeEvidence,
  type ApplicationOutcomeReason,
  type ApplicationRecord,
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
} from "../lib/interview-prep"
import {
  getBrowserCloudSyncReadiness,
  prepareProfileSyncAction
} from "../lib/cloud-sync"

type DashboardTab = "profile" | "jobs" | "applications" | "interview"
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

type ContextSuggestion = ProductContext & {
  targetRoles: string
  workRightPrompt: string
  confidence: "Low" | "Medium" | "High"
  reasons: string[]
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

type InterviewBuddyOutputKey =
  | "professionalAnswer"
  | "naturalAnswer"
  | "lightFunnyAnswer"
  | "strongFinalAnswer"

type InterviewBuddyOutputs = Record<InterviewBuddyOutputKey, string>

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
  limits: string[]
}

const analyticsServiceBaseUrl =
  process.env.NEXT_PUBLIC_ANALYTICS_URL ?? "/analytics"
const storageKey = "autotime-v2-companion-dashboard"
const productContextStorageKey = "autotime-v2-product-context"
const trustStateStorageKey = "autotime-v2-trust-state"

const applicationStatuses: ApplicationStatus[] = [
  "Saved",
  "Applying",
  "Applied",
  "Interview",
  "Rejected",
  "Closed"
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

const dashboardRoutes: Array<{
  href: string
  id: DashboardTab | "overview"
  label: string
  summary: string
}> = [
  {
    href: "/dashboard",
    id: "overview",
    label: "Overview",
    summary: "Status, evidence and next workflow step."
  },
  {
    href: "/dashboard/profile",
    id: "profile",
    label: "Profile",
    summary: "Candidate evidence and reusable answers."
  },
  {
    href: "/dashboard/jobs",
    id: "jobs",
    label: "Job Check",
    summary: "Role fit, missing evidence and decision limits."
  },
  {
    href: "/dashboard/applications",
    id: "applications",
    label: "Applications",
    summary: "Pipeline, outcomes and follow-up actions."
  },
  {
    href: "/dashboard/interview",
    id: "interview",
    label: "Interview Buddy",
    summary: "Interview answers and prep packs."
  }
]

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
    note:
      "Use this as a starting point, then verify the hiring country directly."
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
    .enum(roleMarkets.map((market) => market.id) as [RoleMarket, ...RoleMarket[]])
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
    .enum(urgencyOptions.map((option) => option.id) as [
      CandidateUrgency,
      ...CandidateUrgency[]
    ])
    .optional(),
  targetCountry: z.string().trim().min(1).optional(),
  experienceLevel: z.string().trim().min(1).optional()
})

const trustStateSchema = z.object({
  officialSourceReviewed: z.boolean().optional(),
  officialSourceReviewedAt: z.string().optional()
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

function getStoredState() {
  if (typeof window === "undefined") {
    return defaultState
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")
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

function saveState(state: CompanionDashboardState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

function getStoredProductContext() {
  if (typeof window === "undefined") {
    return defaultProductContext
  }

  try {
    const parsed = productContextSchema.safeParse(
      JSON.parse(
        window.localStorage.getItem(productContextStorageKey) ?? "null"
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

function saveProductContext(context: ProductContext) {
  window.localStorage.setItem(productContextStorageKey, JSON.stringify(context))
}

function getStoredTrustState(): TrustState {
  if (typeof window === "undefined") {
    return defaultTrustState
  }

  try {
    const parsed = trustStateSchema.safeParse(
      JSON.parse(window.localStorage.getItem(trustStateStorageKey) ?? "null")
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

function saveTrustState(state: TrustState) {
  window.localStorage.setItem(trustStateStorageKey, JSON.stringify(state))
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
  const profileContext = getProfileContextForInterview(profile)
  const evidenceLine = profileContext
    ? `I would connect that to my profile evidence: ${normaliseSentence(profileContext)}`
    : "I would keep the answer limited to the experience I can clearly evidence."
  const limitLine =
    "I would avoid adding claims that are not already in my draft or saved profile."

  if (!cleanDraft) {
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

function hasJobDraft(job: JobAnalysisDraft) {
  return Boolean(
    job.jobTitle.trim() || job.company.trim() || job.jobDescription.trim() ||
      job.jobUrl.trim()
  )
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
      application.status === "Rejected" || application.status === "Closed"
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
      base.appliedAt ??
      (application.status === "Applied" ? now : undefined),
    interviewAt:
      base.interviewAt ??
      (application.status === "Interview" ? now : undefined),
    closedAt:
      base.closedAt ??
      (application.status === "Rejected" || application.status === "Closed"
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
          reason === "Unknown" ? signals.totalTracked : signals.totalTracked + 1,
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

function getRoleMarket(context: Pick<ProductContext, "roleMarket">) {
  return (
    roleMarkets.find((market) => market.id === context.roleMarket) ??
    roleMarkets[0]
  )
}

function getCountryGuidance(context: ProductContext) {
  const country = context.targetCountry || "selected country"

  if (context.candidatePosition === "foreign-candidate") {
    return `${country} checks should include work-right clarity, sponsorship wording, relocation practicality, timezone or location fit, and missing evidence before any application advice is used.`
  }

  return `${country} checks should include local availability, salary and notice-period consistency, role seniority, domain fit, and missing evidence before next steps are suggested.`
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

function getAIUseCases(context: ProductContext) {
  return [
    {
      title: "Country evidence",
      body: `${context.targetCountry} should be used only with job location, salary, seniority and work-right evidence.`
    },
    {
      title: "Work-right evidence",
      body:
        context.candidatePosition === "foreign-candidate"
          ? "Sponsorship, relocation timing and local presence must be treated as checks that need evidence."
          : "Notice period, salary range and local availability must stay consistent with the saved profile."
    },
    {
      title: "Role evidence",
      body: getMarketPositioning(context)
    },
    {
      title: "Action evidence",
      body: "Saved jobs should keep source, next action, status and interview stage traceable."
    }
  ]
}

function getEuropeanStrategySteps(context: ProductContext) {
  return [
    {
      title: "Country",
      body: `${context.targetCountry} is the current target country. Compare other markets only when profile and work-right evidence is complete.`
    },
    {
      title: "Job source",
      body:
        "Use clear job descriptions, named locations, realistic seniority and employer source details as quality signals."
    },
    {
      title: "Role language",
      body: getRoleMarket(context).positioning
    }
  ]
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

  return ranked[0]?.score ? ranked[0].market : getRoleMarket({ roleMarket: fallback })
}

function inferContextFromResume(
  resumeText: string,
  current: ProductContext
): ContextSuggestion {
  const words = resumeText.trim().split(/\s+/).filter(Boolean)
  const inferredMarket = inferRoleMarketFromText(
    resumeText,
    current.roleMarket
  )
  const roleMarket = inferredMarket.id
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
      inferredMarket.targetRoles,
    workRightPrompt:
      candidatePosition === "foreign-candidate"
        ? "Confirm visa/work-right status, sponsorship need, relocation timing and eligible countries before applying."
        : "Confirm local work-right status, notice period, salary expectations and availability before applying.",
    confidence:
      words.length > 120 ? "High" : words.length > 50 ? "Medium" : "Low",
    reasons: [
      inferredMarket.detectedReason,
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
    (state.jobAnalysis.gaps?.length ?? 0) > 0 &&
      `${state.jobAnalysis.gaps?.length} saved role gap${
        state.jobAnalysis.gaps?.length === 1 ? "" : "s"
      } need review.`
  ].filter(Boolean) as string[]

  return {
    decision: fitEvaluation.decision,
    confidence: fitEvaluation.confidence,
    score: fitEvaluation.overallScore,
    contentGate: fitEvaluation.contentGate,
    rationale: [
      `Assessment mode: ${getMarketLabel(context)} / ${context.targetCountry}.`,
      `Decision index: ${fitEvaluation.overallScore}/100. Profile readiness: ${readinessScore}/100.`,
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
            "Save the role into Applications.",
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
      limit: "A thin or partial job post can hide sponsorship, location or salary constraints."
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
          ? `${blockedChecks.length} required check${
              blockedChecks.length === 1 ? "" : "s"
            } blocked.`
          : needsCheck.length > 0
            ? `${needsCheck.length} check${
                needsCheck.length === 1 ? "" : "s"
              } still need manual confirmation.`
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

export default function HomePage({
  view = "overview"
}: {
  view?: DashboardTab | "overview"
}) {
  const [state, setState] = useState<CompanionDashboardState>(defaultState)
  const [importJson, setImportJson] = useState("")
  const [status, setStatus] = useState("")
  const [productContext, setProductContext] = useState<ProductContext>(
    defaultProductContext
  )
  const [resumeIntake, setResumeIntake] = useState("")
  const [contextSuggestion, setContextSuggestion] =
    useState<ContextSuggestion | null>(null)
  const [interviewQuestion, setInterviewQuestion] = useState(
    interviewQuestionOptions[0]
  )
  const [customInterviewQuestion, setCustomInterviewQuestion] = useState("")
  const [interviewDraftAnswer, setInterviewDraftAnswer] = useState("")
  const [interviewBuddyOutputs, setInterviewBuddyOutputs] =
    useState<InterviewBuddyOutputs>(emptyInterviewBuddyOutputs)
  const [cloudSyncConsent, setCloudSyncConsent] = useState(false)
  const [trustState, setTrustState] = useState<TrustState>(defaultTrustState)
  const [onlineAnalyticsReport, setOnlineAnalyticsReport] =
    useState<OnlineAnalyticsReport | null>(null)
  const [onlineAnalyticsStatus, setOnlineAnalyticsStatus] = useState("")
  const fitScore = useMemo(
    () => getFitScore(state.profile, state.jobAnalysis),
    [state.profile, state.jobAnalysis]
  )
  const outcomeLearningSignals = useMemo(
    () => getOutcomeLearningSignals(state.applications),
    [state.applications]
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
  const europeanStrategySteps = useMemo(
    () => getEuropeanStrategySteps(productContext),
    [productContext]
  )
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
  const profileBridgeReady = useMemo(
    () => hasCandidateProfileBridgeEvidence(state.profile),
    [state.profile]
  )
  const cloudSyncReadiness = useMemo(() => getBrowserCloudSyncReadiness(), [])
  const interviewApplications = state.applications.filter(
    (application) => application.status === "Interview"
  )
  const persistedEvidenceRecords = state.evidenceRecords ?? []
  const persistedOutcomeRecords = state.outcomeRecords ?? []
  const outcomeAnalytics = useMemo(
    () => getOutcomeAnalytics(persistedOutcomeRecords),
    [persistedOutcomeRecords]
  )
  const currentTab: DashboardTab = view === "overview" ? "profile" : view
  const isOverview = view === "overview"

  useEffect(() => {
    setState(getStoredState())
    setProductContext(getStoredProductContext())
    setTrustState(getStoredTrustState())
  }, [])

  const persist = (next: CompanionDashboardState, message: string) => {
    setState(next)
    saveState(next)
    setStatus(message)
    setTimeout(() => setStatus(""), 3000)
  }

  const runOnlineAnalytics = async () => {
    if (!persistedEvidenceRecords.length && !persistedOutcomeRecords.length) {
      setOnlineAnalyticsStatus("Save a checked job before running analytics.")
      return
    }

    setOnlineAnalyticsStatus("Running Python analytics from saved evidence...")
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
        "Python analytics updated from evidence and outcomes."
      )
    } catch (error) {
      setOnlineAnalyticsReport(null)
      setOnlineAnalyticsStatus(
        error instanceof Error
          ? `Python analytics unavailable: ${error.message}`
          : "Python analytics unavailable."
      )
    }
  }

  const updateProfile = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setState((current) => {
      const next = {
        ...current,
        profile: { ...current.profile, [key]: value }
      }
      saveState(next)
      return next
    })
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
      saveState(next)
      return next
    })
  }

  const updateReusableAnswer = <K extends keyof ReusableAnswers>(
    key: K,
    value: ReusableAnswers[K]
  ) => {
    setState((current) => {
      const next = {
        ...current,
        reusableAnswers: { ...current.reusableAnswers, [key]: value }
      }
      saveState(next)
      return next
    })
  }

  const setOfficialSourceReviewed = (reviewed: boolean) => {
    const next = {
      officialSourceReviewed: reviewed,
      officialSourceReviewedAt: reviewed ? new Date().toISOString() : ""
    }
    setTrustState(next)
    saveTrustState(next)
  }

  const openDashboardView = (nextView: DashboardTab) => {
    window.location.assign(`/dashboard/${nextView}`)
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
    const market = getRoleMarket(productContext)

    persist(
      {
        ...state,
        profile: {
          ...state.profile,
          targetCountries: productContext.targetCountry,
          targetRoles: market.targetRoles,
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
            `Profile settings: ${getMarketLabel(productContext)} / ${
              productContext.candidatePosition === "foreign-candidate"
                ? "foreign or relocating"
                : "native or local"
            } / ${productContext.targetCountry} / ${productContext.urgency}.`
          ]
            .filter(Boolean)
            .join("\n")
        }
      },
      "Profile settings applied to saved evidence"
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
    if (!hasJobDraft(state.jobAnalysis)) {
      setStatus("Add a job title, company, URL or job description before saving")
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
    persist(
      {
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
      },
      "Application saved with evidence and outcome records"
    )
    openDashboardView("applications")
  }

  const updateApplication = (
    id: string,
    changes: Partial<ApplicationRecord>
  ) => {
    const updatedApplications = state.applications.map((application) =>
      application.id === id ? { ...application, ...changes } : application
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

    persist(
      {
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
      },
      "Application and outcome record updated"
    )
  }

  const deleteApplication = (id: string) => {
    persist(
      {
        ...state,
        applications: state.applications.filter(
          (application) => application.id !== id
        ),
        evidenceRecords: (state.evidenceRecords ?? []).filter(
          (record) => record.applicationId !== id
        ),
        outcomeRecords: (state.outcomeRecords ?? []).filter(
          (record) => record.applicationId !== id
        ),
        interviewPrepPacks: state.interviewPrepPacks.filter(
          (pack) => pack.applicationId !== id
        )
      },
      "Application removed"
    )
  }

  const saveInterviewPrepPack = (
    pack: CompanionDashboardState["interviewPrepPacks"][number],
    message: string
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
    openDashboardView("interview")
  }

  const generateInterviewPrep = (application: ApplicationRecord) => {
    const pack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )
    saveInterviewPrepPack(pack, "Interview prep pack generated")
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
        "No claim without evidence. No score without explanation. No application advice without clear limits.",
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

      persist(result.data, "Dashboard imported")
      setImportJson("")
    } catch {
      setStatus("Import failed: invalid JSON")
    }
  }

  const explainCloudSyncTrack = () => {
    setStatus(
      cloudSyncReadiness.configured
        ? "Cloud sync is ready for signed-in profile upload and download. Database writes require user consent and an authenticated account."
        : `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
    )
  }

  const syncProfileToCloud = async () => {
    const action = prepareProfileSyncAction({
      readiness: cloudSyncReadiness,
      session: {
        checked: true,
        authenticated: true,
        userEmail: "signed-in-account",
        message: "Dashboard session will be checked by the sync endpoint."
      },
      profile: state.profile,
      explicitUserAction: true,
      consentGranted: cloudSyncConsent
    })

    if (!action.ready) {
      setStatus(action.message)
      return
    }

    try {
      const response = await fetch("/api/sync/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-autotime-source": "web"
        },
        body: JSON.stringify(state.profile)
      })
      const body = (await response.json()) as {
        error: string | null
      }

      if (!response.ok || body.error) {
        setStatus(body.error ?? "Profile sync failed")
        return
      }

      setStatus("Profile synced to your dashboard account")
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Profile sync failed"
      )
    }
  }

  const loadProfileFromCloud = async () => {
    if (!cloudSyncReadiness.configured) {
      setStatus(
        `Cloud sync remains local-first: ${cloudSyncReadiness.issues.join(", ")}.`
      )
      return
    }

    try {
      const response = await fetch("/api/sync/profile")
      const body = (await response.json()) as {
        data: { profile: CandidateProfile | null } | null
        error: string | null
      }

      if (!response.ok || body.error) {
        setStatus(body.error ?? "Could not load synced profile")
        return
      }

      if (!body.data?.profile) {
        setStatus("No synced profile found for this account yet")
        return
      }

      persist(
        {
          ...state,
          profile: body.data.profile
        },
        "Synced profile loaded into this browser"
      )
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Could not load synced profile"
      )
    }
  }
  const canSaveCheckedJob = hasJobDraft(state.jobAnalysis)
  const activeInterviewQuestion =
    customInterviewQuestion.trim() || interviewQuestion
  const interviewDisclaimer = getInterviewBuddyDisclaimer(activeInterviewQuestion)
  const finalAnswerStorageKey = inferReusableAnswerKey(activeInterviewQuestion)
  const hasInterviewBuddyOutputs = Boolean(
    interviewBuddyOutputs.strongFinalAnswer.trim()
  )

  const generateInterviewBuddyAnswers = () => {
    if (!activeInterviewQuestion.trim()) {
      setStatus("Choose or type an interview question first")
      return
    }

    if (!interviewDraftAnswer.trim()) {
      setStatus("Add your rough draft answer first")
      return
    }

    setInterviewBuddyOutputs(
      createInterviewBuddyOutputs({
        draft: interviewDraftAnswer,
        profile: state.profile,
        question: activeInterviewQuestion
      })
    )
    setStatus("Interview Buddy answers generated from your draft")
    setTimeout(() => setStatus(""), 3000)
  }

  const saveFinalInterviewAnswer = () => {
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

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">AutoTime EU Apply</p>
          <h1>Dashboard workspace</h1>
          <p>
            Review saved profile evidence, check the current role, and track
            next actions. Scores and advice stay limited when required evidence
            is missing.
          </p>
          <div
            className="header-actions"
            aria-label="Primary dashboard actions"
          >
            <button
              disabled={!canSaveCheckedJob}
              type="button"
              onClick={saveApplicationFromJob}
            >
              Save checked job
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={exportDashboard}
            >
              Export backup
            </button>
          </div>
        </div>
        <div className="executive-panel" aria-label="Dashboard evidence summary">
          <div>
            <small>Profile evidence</small>
            <strong>{readinessScore}</strong>
          </div>
          <div>
            <small>Decision index</small>
            <strong>{fitEvaluation.overallScore}</strong>
          </div>
          <p>{fitEvaluation.decision}</p>
        </div>
      </header>

      {!isOverview && currentTab === "profile" && (
      <section className="market-context-panel" aria-label="Profile settings">
        <div className="section-intro">
          <p className="eyebrow">Profile settings</p>
          <h2>Inputs used for role checks</h2>
          <p>
            These settings tell the dashboard how to interpret a job. Update
            them when your target country, role focus or work-right situation
            changes.
          </p>
        </div>

        <div className="context-grid">
          <fieldset className="segmented-field">
            <legend>Target role focus</legend>
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
            <button type="button" onClick={applyMarketContextToProfile}>
              Use these choices
            </button>
          </div>
        </div>

        <div
          className="ai-use-case-grid"
          aria-label="Decision evidence checks"
        >
          {getAIUseCases(productContext).map((useCase) => (
            <article key={useCase.title}>
              <h3>{useCase.title}</h3>
              <p>{useCase.body}</p>
            </article>
          ))}
        </div>

        <section className="market-strategy-panel">
          <div className="section-heading">
            <p className="eyebrow">Decision checks</p>
            <h2>Evidence required before action</h2>
            <p>
              Each check should show the evidence used, the risk found and the
              limit of what the dashboard can safely conclude.
            </p>
          </div>
          <div className="strategy-card-grid">
            {europeanStrategySteps.map((step) => (
              <article key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-intake-panel" aria-label="CV context review">
          <div className="section-heading">
            <p className="eyebrow">CV import</p>
            <h2>Use CV text to update profile evidence</h2>
            <p>
              Suggestions remain pending until you approve them. Nothing in
              your profile is overwritten automatically.
            </p>
          </div>
          <label>
            CV or profile text
            <textarea
              placeholder="Add CV, resume, or LinkedIn summary text. Suggested profile updates stay pending until you approve them."
              value={resumeIntake}
              onChange={(event) => setResumeIntake(event.target.value)}
            />
          </label>
          <div className="header-actions">
            <button type="button" onClick={reviewResumeForContext}>
              Review my CV
            </button>
            <button
              className="secondary-button"
              disabled={!contextSuggestion}
              type="button"
              onClick={approveContextSuggestion}
            >
              Apply suggestions
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
                  <dt>Work authorisation status</dt>
                  <dd>
                    {contextSuggestion.candidatePosition === "foreign-candidate"
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

        <p className="context-guidance">{getCountryGuidance(productContext)}</p>
      </section>
      )}

      {currentTab === "jobs" && (
      <section
        className="decision-brief-panel"
        aria-label="UK/EU apply decision brief"
      >
        <div>
          <p className="eyebrow">Job decision</p>
          <h2>Current role decision</h2>
          <p>
            This panel uses saved profile evidence and job details. If the
            evidence is incomplete, the decision stays limited and shows what is
            missing.
          </p>
        </div>
        <div className="decision-score">
          <strong>{decisionBrief.score}</strong>
          <span>{decisionBrief.decision}</span>
          <small>{decisionBrief.confidence} rule confidence</small>
          <small>
            {decisionBrief.contentGate === "ready"
              ? "No content blocker detected"
              : decisionBrief.contentGate === "stretch"
                ? "Stretch label required"
                : "Content blocked"}
          </small>
          <small>Decision index, not probability</small>
        </div>
        <div className="decision-columns">
          <section>
            <h3>Why this score</h3>
            <ul className="bullets-list">
              {decisionBrief.rationale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Evidence found</h3>
            <ul className="bullets-list">
              {decisionBrief.evidenceFound.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Risks to verify</h3>
            <ul className="bullets-list">
              {decisionBrief.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>What is missing</h3>
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
            <h3>Next steps</h3>
            <ul className="bullets-list">
              {decisionBrief.nextActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
        <p className="decision-integrity-note">
          No claim without evidence. No score without explanation. No
          application advice without clear limits.
        </p>
        <p className="decision-integrity-note">
          This is a rule-based decision aid using the profile and job text saved
          in this browser. It is not an official employer, immigration,
          sponsorship or legal decision.
        </p>
      </section>
      )}

      {currentTab === "jobs" && (
      <section className="trust-grid" aria-label="Evidence and official verification">
        <section className="evidence-ledger-panel">
          <div className="section-heading">
            <p className="eyebrow">Evidence ledger</p>
            <h2>Every recommendation must be traceable</h2>
            <p>
              Each row separates the check, the evidence used and the limit of
              what AutoTime can safely conclude.
            </p>
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
                    <dt>Evidence</dt>
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
            <p className="eyebrow">AI honesty guardrails</p>
            <h2>Content generation is allowed only when evidence supports it</h2>
            <p>
              AutoTime must not write around blockers, invent proof or present
              uncertain advice as verified.
            </p>
          </div>
          <div className="guardrail-list">
            {contentGuardrails.map((item) => (
              <article className="guardrail-item" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span className={`guardrail-status ${item.status}`}>
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
            <p>
              These checks keep the workflow honest before you save, tailor or
              submit an application.
            </p>
          </div>
          <div className="verification-list">
            {verificationChecklist.map((item) => (
              <article className="verification-item" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span className={`verification-status ${item.status}`}>
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
            <h2>Check the source before relying on visa or work-right advice</h2>
            <p>
              These links are provided for verification. AutoTime does not
              authorise employment, sponsorship, visas or immigration status.
            </p>
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
            I have reviewed the official source for this country and understand
            AutoTime does not authorise work, visa or sponsorship status.
          </label>
        </section>
      </section>
      )}

      <nav className="tab-bar" aria-label="Dashboard sections">
        {dashboardRoutes.map((route) => (
          <a
            aria-current={view === route.id ? "page" : undefined}
            className={view === route.id ? "tab-button active" : "tab-button"}
            href={route.href}
            key={route.id}
          >
            {route.label}
          </a>
        ))}
      </nav>

      {status && <p className="status-banner">{status}</p>}

      {isOverview && (
        <section className="dashboard-route-grid" aria-label="Dashboard workflow">
          {dashboardRoutes
            .filter((route) => route.id !== "overview")
            .map((route) => (
              <a className="dashboard-route-card" href={route.href} key={route.id}>
                <strong>{route.label}</strong>
                <span>{route.summary}</span>
              </a>
            ))}
        </section>
      )}

      {!isOverview && currentTab === "profile" && (
      <section
        className={
          profileBridgeReady
            ? "profile-bridge-panel ready"
            : "profile-bridge-panel blocked"
        }
        aria-label="Profile readiness"
      >
        <div>
          <p className="eyebrow">Profile readiness</p>
          <h2>
            {profileBridgeReady
              ? "Profile evidence is ready"
              : "Complete profile evidence"}
          </h2>
          <p>
            Target roles, CV text and work-right details are required before job
            checks can make stronger recommendations.
          </p>
        </div>
        {profileBridgeReady ? (
          <ul className="bullets-list">
            <li>Profile evidence can support job-fit scores and next steps.</li>
            <li>Work-right and country details are available for checks.</li>
            <li>You can export a backup any time.</li>
          </ul>
        ) : (
          <ul className="bullets-list">
            {profileBridgeIssues.map((issue) => (
              <li key={issue}>Add {issue}</li>
            ))}
          </ul>
        )}
      </section>
      )}

      {!isOverview && currentTab === "profile" && (
      <section
        className={
          cloudSyncReadiness.configured
            ? "cloud-sync-panel flagged"
            : "cloud-sync-panel local"
        }
        aria-label="Sync status"
      >
        <div>
          <p className="eyebrow">Sync</p>
          <h2>
            {cloudSyncReadiness.configured
              ? "Cloud sync is being prepared"
              : "Your data is saved on this browser"}
          </h2>
          <p>
            AutoTime is local-first today. Export a backup when you want to move
            data between browsers, and use account sync when it is fully ready.
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
          <label className="sync-consent-control">
            <input
              checked={cloudSyncConsent}
              disabled={!cloudSyncReadiness.configured}
              type="checkbox"
              onChange={(event) => setCloudSyncConsent(event.target.checked)}
            />
            I consent to sync my candidate profile to my authenticated account.
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={explainCloudSyncTrack}
          >
            Check sync status
          </button>
          <button
            disabled={!cloudSyncReadiness.configured}
            type="button"
            onClick={syncProfileToCloud}
          >
            Sync profile
          </button>
          <button
            className="secondary-button"
            disabled={!cloudSyncReadiness.configured}
            type="button"
            onClick={loadProfileFromCloud}
          >
            Load synced profile
          </button>
        </div>
      </section>
      )}

      {(isOverview || currentTab === "applications" || currentTab === "interview") && (
      <section
        className="metrics-strip"
        aria-label="Job search progress"
      >
        <div
          className={`metric-card ${getMetricTone(state.applications.length, 3)}`}
        >
          <span>{state.applications.length}</span>
          <small>Saved jobs</small>
          <p>
            {statusCounts.Applied + statusCounts.Interview} progressed beyond
            saved
          </p>
        </div>
        <div
          className={`metric-card ${getMetricTone(interviewApplications.length, 1)}`}
        >
          <span>{interviewApplications.length}</span>
          <small>Interviews</small>
          <p>
            {state.interviewPrepPacks.length} prep pack
            {state.interviewPrepPacks.length === 1 ? "" : "s"} ready
          </p>
        </div>
        <div
          className={`metric-card ${activeActionCount > 0 ? "neutral" : "warn"}`}
        >
          <span>{activeActionCount}</span>
          <small>Next actions</small>
          <p>Follow-ups tracked across live roles</p>
        </div>
        <div className="metric-card warn">
          <span>{state.jobAnalysis.skills?.length ?? 0}</span>
          <small>Job details</small>
          <p>{riskLabel}</p>
        </div>
      </section>
      )}

      {isOverview && (
      <section className="readiness-roadmap" aria-label="Readiness roadmap">
        <div className="section-intro">
          <p className="eyebrow">Quick checklist</p>
          <h2>Before you spend time on this job</h2>
        </div>
        {[
          {
            title: "1. Confirm your target",
            done:
              Boolean(state.profile.targetRoles.trim()) &&
              Boolean(productContext.targetCountry),
            body:
              productContext.candidatePosition === "foreign-candidate"
                ? "Target country, role focus and relocation status should be clear."
                : "Target country, role focus and local availability should be clear."
          },
          {
            title: "2. Add your CV proof",
            done: Boolean(state.profile.baseCvText.trim()),
            body: "Your CV text should include the skills and examples this role needs."
          },
          {
            title: "3. Check work-right risk",
            done: Boolean(state.profile.workRightDetails.trim()),
            body: "Work rights, sponsorship, relocation, salary and notice period should be clear enough."
          },
          {
            title: "4. Decide apply or skip",
            done: Boolean(state.jobAnalysis.jobDescription.trim()),
            body: "A real job description lets AutoTime score fit, risks and next actions."
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
      )}

      {!isOverview && currentTab === "profile" && (
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
                placeholder="Example: UK citizen, settled/pre-settled status, Skilled Worker visa, EU citizen, or no sponsorship required. Add only facts you can verify."
                value={state.profile.workRightDetails}
                onChange={(event) =>
                  updateProfile("workRightDetails", event.target.value)
                }
              />
            </label>
            <label>
              CV text
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
                <p className="eyebrow">Profile summary</p>
                <h2>Your job-search basics</h2>
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
                <p className="eyebrow">Reusable answers</p>
                <h2>Answers you can reuse</h2>
              </div>
              <label>
                Motivation answer
                <textarea
                  value={state.reusableAnswers.motivationAnswer}
                  onChange={(event) =>
                    updateReusableAnswer("motivationAnswer", event.target.value)
                  }
                />
              </label>
              <label>
                Strengths answer
                <textarea
                  value={state.reusableAnswers.strengthsAnswer}
                  onChange={(event) =>
                    updateReusableAnswer("strengthsAnswer", event.target.value)
                  }
                />
              </label>
            </section>
          </div>
        </section>
      )}

      {!isOverview && currentTab === "jobs" && (
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
            <button
              disabled={!canSaveCheckedJob}
              type="button"
              onClick={saveApplicationFromJob}
            >
              {fitEvaluation.contentGate === "ready"
                ? "Save viable job"
                : fitEvaluation.contentGate === "stretch"
                  ? "Save as stretch"
                  : "Save blocker for review"}
            </button>
          </div>

          <div className="output-column">
            <section className="panel country-fit-panel">
              <div className="section-heading">
                <p className="eyebrow">Country-fit model</p>
                <h2>{fitEvaluation.decision}</h2>
              </div>
              <div className="fit-gate-banner">
                <strong>{fitEvaluation.overallScore}</strong>
                <span>
                  {fitEvaluation.contentGate === "ready"
                    ? "No content blocker detected by current rules"
                    : fitEvaluation.contentGate === "stretch"
                      ? "Stretch application: label the risk"
                      : "Do not write content yet"}
                </span>
              </div>
              <div className="country-rule-strip">
                <div>
                  <strong>{fitEvaluation.countryRule.name}</strong>
                  <span>{fitEvaluation.countryRule.marketNote}</span>
                </div>
                <dl>
                  <div>
                    <dt>Sponsorship</dt>
                    <dd>{fitEvaluation.countryRule.sponsorshipStrictness}</dd>
                  </div>
                  <div>
                    <dt>Relocation</dt>
                    <dd>{fitEvaluation.countryRule.relocationFriction}</dd>
                  </div>
                  <div>
                    <dt>Outcomes</dt>
                    <dd>{outcomeLearningSignals.totalTracked}</dd>
                  </div>
                </dl>
              </div>
              <div className="fit-component-grid">
                {fitEvaluation.components.map((item) => (
                  <article className={`fit-component ${item.status}`} key={item.key}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.score}/100</span>
                    </div>
                    <small>{item.status}</small>
                    <p>{item.rationale}</p>
                    <ul className="component-evidence-list">
                      {item.evidence.length ? (
                        item.evidence.map((evidence) => (
                          <li key={evidence}>{evidence}</li>
                        ))
                      ) : (
                        <li>No direct supporting evidence found yet.</li>
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
                  No blocker was detected by the current rules. Verify employer
                  requirements before applying.
                </p>
              )}
              <ul className="evidence-list">
                {fitEvaluation.evidenceChecklist.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="panel">
              <div className="section-heading">
                <p className="eyebrow">Positioning first</p>
                <h2>
                  {fitEvaluation.contentGate === "blocked"
                    ? "Resolve the blocker before writing"
                    : "Best angle before application content"}
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

      {!isOverview && currentTab === "applications" && (
        <section className="applications-section full-width-section">
          <div className="section-intro">
            <p className="eyebrow">Applications</p>
            <h2>Your job application tracker</h2>
            <p>
              Keep every role, status and next action in one place, so follow-up
              never depends on memory.
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
          <section
            className="analytics-grid"
            aria-label="Evidence and outcome analytics"
          >
            <article>
              <span>{persistedEvidenceRecords.length}</span>
              <strong>Evidence records</strong>
              <p>Stored checks from saved jobs, profile proof and risks.</p>
            </article>
            <article>
              <span>{outcomeAnalytics.total}</span>
              <strong>Outcome records</strong>
              <p>Saved decisions with status and result changes.</p>
            </article>
            <article>
              <span>{outcomeAnalytics.interviews}</span>
              <strong>Interview signals</strong>
              <p>Tracked interview outcomes for future calibration.</p>
            </article>
            <article>
              <span>
                {outcomeAnalytics.calibrationReady ? "Ready" : "Collecting"}
              </span>
              <strong>Calibration status</strong>
              <p>
                {outcomeAnalytics.calibrationReady
                  ? "Enough records exist to begin score-band calibration."
                  : "Decision Index remains non-probability until enough outcomes exist."}
              </p>
            </article>
          </section>
          <section className="online-analytics-panel">
            <div className="section-heading">
              <p className="eyebrow">Python analytics</p>
              <h2>Online evidence and outcome report</h2>
              <p>
                Descriptive analytics only: observed outcomes from saved records,
                not a promise or probability claim.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={runOnlineAnalytics}
            >
              Run Python analytics
            </button>
            {onlineAnalyticsStatus ? (
              <p className="status-message">{onlineAnalyticsStatus}</p>
            ) : null}
            {onlineAnalyticsReport ? (
              <div className="online-analytics-results">
                <article>
                  <span>
                    {Math.round(
                      onlineAnalyticsReport.summary.observedInterviewRate
                    )}
                    %
                  </span>
                  <strong>Observed interview rate</strong>
                  <p>Based only on tracked outcome records.</p>
                </article>
                <article>
                  <span>
                    {onlineAnalyticsReport.summary.calibrationReady
                      ? "Ready"
                      : "Collecting"}
                  </span>
                  <strong>Calibration readiness</strong>
                  <p>{onlineAnalyticsReport.summary.calibrationStatus}</p>
                </article>
                <article>
                  <span>{onlineAnalyticsReport.summary.interviewSignals}</span>
                  <strong>Interview signals</strong>
                  <p>Outcome records marked as interview or final stage.</p>
                </article>
                <div className="score-band-table">
                  <strong>Score-band outcomes</strong>
                  {onlineAnalyticsReport.scoreBands.length ? (
                    onlineAnalyticsReport.scoreBands.map((band) => (
                      <div key={band.band}>
                        <span>{band.band}</span>
                        <span>{band.records} records</span>
                        <span>{band.interviews} interviews</span>
                        <span>
                          {Math.round(band.observedInterviewRate)}% observed
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>No score-band outcomes yet.</p>
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
                These records are saved with applications so future scoring can
                be audited and calibrated against real outcomes.
              </p>
            </div>
            <div className="evidence-record-list">
              {persistedEvidenceRecords.length ? (
                persistedEvidenceRecords.slice(0, 6).map((record) => (
                  <article className="evidence-record-card" key={record.id}>
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
                    {application.fitDecision ? (
                      <small>
                        Decision index {application.fitScore ?? 0} -{" "}
                        {application.fitDecision}
                        {application.contentGate === "stretch"
                          ? " - stretch"
                          : application.contentGate === "blocked"
                            ? " - blocked"
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
                    <button
                      className="secondary-button"
                      disabled={application.status !== "Interview"}
                      type="button"
                      onClick={() => generateInterviewPrep(application)}
                    >
                      Generate Prep
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => deleteApplication(application.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state rich-empty-state">
                <strong>No saved jobs yet</strong>
                <p>
                  Check a role, then save it with a next action and status.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {!isOverview && currentTab === "interview" && (
        <section className="prep-section full-width-section">
          <div className="section-intro">
            <p className="eyebrow">Interview Buddy</p>
            <h2>Shape a rough answer into interview-ready versions</h2>
            <p>
              Interview Buddy rewrites only what you provide and what is saved
              in your profile. It does not invent experience, claims or legal
              advice.
            </p>
          </div>

          <div className="interview-buddy-layout">
            <section
              className="interview-buddy-form"
              aria-label="Interview Buddy input"
            >
              <div className="buddy-character-panel">
                <span aria-hidden="true">:)</span>
                <div>
                  <strong>Buddy check</strong>
                  <p>
                    Keep it honest, specific and calm. A rough draft is enough
                    to start.
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
                  placeholder="Write the honest version first. Include only facts, examples and outcomes you can explain."
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
                <button type="button" onClick={generateInterviewBuddyAnswers}>
                  Generate answers
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
              {(
                [
                  ["professionalAnswer", "Professional answer"],
                  ["naturalAnswer", "Natural answer"],
                  ["lightFunnyAnswer", "Light funny version"],
                  ["strongFinalAnswer", "Strong final interview answer"]
                ] as Array<[InterviewBuddyOutputKey, string]>
              ).map(([key, label]) => (
                <article className="buddy-answer-card" key={key}>
                  <div>
                    <h3>{label}</h3>
                    <button
                      className="secondary-button"
                      disabled={!interviewBuddyOutputs[key]}
                      type="button"
                      onClick={() => speakInterviewAnswer(interviewBuddyOutputs[key])}
                    >
                      Speak
                    </button>
                  </div>
                  <p>
                    {interviewBuddyOutputs[key] ||
                      "Generate answers to see this version."}
                  </p>
                </article>
              ))}
            </section>
          </div>

          <div className="section-intro">
            <p className="eyebrow">Saved prep packs</p>
            <h2>Prep generated from applications</h2>
            <p>
              Prep packs still use saved profile, job details and application
              status. They remain separate from Interview Buddy answers.
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
                Move an application to Interview, then generate a prep pack.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="utility-bar">
        <button type="button" onClick={saveDashboard}>
          Save changes
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={exportDashboard}
        >
          Export backup
        </button>
        <label className="import-control">
          Import backup
          <textarea
            placeholder="Paste exported AutoTime dashboard JSON"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => importDashboard(importJson)}
        >
          Import backup
        </button>
      </section>
    </main>
  )
}
