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
  type JobAnalysisDraft,
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

const tabLabels: Array<[DashboardTab, string]> = [
  ["profile", "My Profile"],
  ["jobs", "Check a Job"],
  ["applications", "Applications"],
  ["interview", "Interview Prep"]
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
  interviewPrepPacks: []
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
      ? result.data
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
    return `For ${country}, AutoTime should check work-right clarity, sponsorship language, relocation practicality, timezone/location fit, and whether the role is worth applying before spending effort.`
  }

  return `For ${country}, AutoTime should focus on local credibility, salary/notice-period consistency, role seniority, domain fit, and interview conversion.`
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
      title: "Pick the right country",
      body: `Focus ${context.targetCountry} roles only when location, salary, seniority and work-right expectations make sense.`
    },
    {
      title: "Check work-right risk",
      body:
        context.candidatePosition === "foreign-candidate"
          ? "Treat sponsorship, relocation timing and local presence as early filters, not afterthoughts."
          : "Keep notice period, salary range and local availability consistent across every application."
    },
    {
      title: "Match role language",
      body: getMarketPositioning(context)
    },
    {
      title: "Follow up deliberately",
      body: "Track source, next action and interview stage across platforms so promising European roles do not disappear."
    }
  ]
}

function getEuropeanStrategySteps(context: ProductContext) {
  return [
    {
      title: "Country focus",
      body: `Start with ${context.targetCountry}, then compare nearby markets only when your profile and work-right story are clear.`
    },
    {
      title: "Hiring platform fit",
      body:
        "Prioritise roles with clear job descriptions, named locations and realistic seniority. Avoid vague reposts unless the company is strategic."
    },
    {
      title: "Application angle",
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("profile")
  const [state, setState] = useState<CompanionDashboardState>(defaultState)
  const [importJson, setImportJson] = useState("")
  const [status, setStatus] = useState("")
  const [productContext, setProductContext] = useState<ProductContext>(
    defaultProductContext
  )
  const [resumeIntake, setResumeIntake] = useState("")
  const [contextSuggestion, setContextSuggestion] =
    useState<ContextSuggestion | null>(null)
  const [cloudSyncConsent, setCloudSyncConsent] = useState(false)
  const [trustState, setTrustState] = useState<TrustState>(defaultTrustState)
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

  const deleteApplication = (id: string) => {
    persist(
      {
        ...state,
        applications: state.applications.filter(
          (application) => application.id !== id
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
      explicitUserAction: true,
      consentGranted: cloudSyncConsent
    })

    setStatus(action.message)
  }
  const canSaveCheckedJob = hasJobDraft(state.jobAnalysis)

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">AutoTime EU Apply</p>
          <h1>Your job search, organised.</h1>
          <p>
            Decide whether a UK/EU role is realistic before writing anything.
            AutoTime checks skill match, country fit, sponsorship, work rights
            and relocation, then turns viable roles into application and
            interview next steps.
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
        <div className="executive-panel" aria-label="Your job search summary">
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

      <section
        className="market-context-panel"
        aria-label="Candidate market context"
      >
        <div className="section-intro">
          <p className="eyebrow">Start here</p>
          <h2>Tell AutoTime what kind of role you want</h2>
          <p>
            Choose your target country, role type and work-right situation.
            AutoTime uses this to shape advice around the European tech market:
            location expectations, sponsorship risk, local role language and
            platform follow-up.
          </p>
        </div>

        <div className="context-grid">
          <fieldset className="segmented-field">
            <legend>Role type</legend>
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
            <legend>Work-right situation</legend>
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
          aria-label="European tech market strategy"
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
            <p className="eyebrow">European tech strategy</p>
            <h2>Turn your search into a country-aware plan</h2>
            <p>
              European tech hiring is fragmented by country, work-right rules,
              platform habits and local role language. AutoTime keeps those
              decisions visible before you apply.
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
            <p className="eyebrow">Profile helper</p>
            <h2>Paste your CV to fill the basics faster</h2>
            <p>
              AutoTime can suggest your role focus, seniority and work-right
              wording from a CV. You approve every change before it updates
              your profile.
            </p>
          </div>
          <label>
            CV or profile text
            <textarea
              placeholder="Paste your CV, resume, or LinkedIn summary. AutoTime suggests profile updates only; it will not overwrite anything without approval."
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
                  <dt>Work-right situation</dt>
                  <dd>
                    {contextSuggestion.candidatePosition === "foreign-candidate"
                      ? "Foreign / relocating"
                      : "Native / local"}
                  </dd>
                </div>
                <div>
                  <dt>Role type</dt>
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
          <p className="eyebrow">Job decision</p>
          <h2>Should you apply, pause, or improve your profile?</h2>
          <p>
            AutoTime turns your profile and the job details into plain next
            steps, so you can spend energy on European roles where the country,
            work-right path and skill match make sense.
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
        aria-label="Profile readiness"
      >
        <div>
          <p className="eyebrow">Profile readiness</p>
          <h2>
            {profileBridgeReady
              ? "Your profile is ready to use"
              : "Finish your profile for better job advice"}
          </h2>
          <p>
            AutoTime works best when your target roles, CV text and work-right
            details are saved. This keeps job checks and interview prep grounded
            in your real experience.
          </p>
        </div>
        {profileBridgeReady ? (
          <ul className="bullets-list">
            <li>Your profile can guide job-fit scores and next steps.</li>
            <li>Work-right and country details can support interview prep.</li>
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
            I consent to sync my candidate profile when account sync is ready.
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
            onClick={explainAccountSync}
          >
            {cloudSyncReadiness.syncActionLabel}
          </button>
        </div>
      </section>

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
                ? "Target country, role type and relocation status should be clear."
                : "Target country, role type and local availability should be clear."
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

      {activeTab === "applications" && (
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

      {activeTab === "interview" && (
        <section className="prep-section full-width-section">
          <div className="section-intro">
            <p className="eyebrow">Interview prep</p>
            <h2>Prepare for the roles that reach interview</h2>
            <p>
              Prep packs use your saved profile, job details and application
              status. They do not invent experience.
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
