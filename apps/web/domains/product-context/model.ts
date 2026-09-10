import { z } from "zod";
import { getUserScopedStorageKey } from "../../platform/persistence/dashboard-state-storage.ts";

export const productContextSchemaVersion = 2;
const productContextStorageKey = "autotime-v2-product-context";

export type RoleMarket =
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
export type CandidateMarketPosition = "foreign-candidate" | "native-candidate"
export type CandidateUrgency = "urgent" | "active" | "exploring"

export type ProductContext = {
  schemaVersion?: number
  roleMarket: RoleMarket | ""
  candidatePosition: CandidateMarketPosition | ""
  urgency: CandidateUrgency | ""
  targetCountry: string
  experienceLevel: string
}

export type ResolvedProductContext = {
  roleMarket: RoleMarket
  candidatePosition: CandidateMarketPosition
  urgency: CandidateUrgency
  targetCountry: string
  experienceLevel: string
}

export const roleMarkets: Array<{
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

export const candidatePositions: Array<{
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

export const urgencyOptions: Array<{ id: CandidateUrgency; label: string }> = [
  { id: "urgent", label: "Urgent" },
  { id: "active", label: "Active" },
  { id: "exploring", label: "Exploring" }
]

export const experienceLevelOptions = [
  "Entry-level",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead"
]

export const euCountryOptions = [
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

export const defaultProductContext: ProductContext = {
  schemaVersion: productContextSchemaVersion,
  roleMarket: "",
  candidatePosition: "",
  urgency: "",
  targetCountry: "",
  experienceLevel: ""
}

export const fallbackProductContext: ResolvedProductContext = {
  roleMarket: "general-tech",
  candidatePosition: "foreign-candidate",
  urgency: "active",
  targetCountry: "United Kingdom",
  experienceLevel: "Mid-level"
}

export const productContextSchema = z.object({
  schemaVersion: z.number().optional(),
  roleMarket: z
    .union([
      z.literal(""),
      z.enum(
        roleMarkets.map((market) => market.id) as [
          RoleMarket,
          ...RoleMarket[]
        ]
      )
    ])
    .optional(),
  candidatePosition: z
    .union([
      z.literal(""),
      z.enum(
        candidatePositions.map((position) => position.id) as [
          CandidateMarketPosition,
          ...CandidateMarketPosition[]
        ]
      )
    ])
    .optional(),
  urgency: z
    .union([
      z.literal(""),
      z.enum(
        urgencyOptions.map((option) => option.id) as [
          CandidateUrgency,
          ...CandidateUrgency[]
        ]
      )
    ])
    .optional(),
  targetCountry: z
    .string()
    .trim()
    .refine((value) => value === "" || euCountryOptions.includes(value), {
      message: "Choose a supported target country."
    })
    .optional(),
  experienceLevel: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || experienceLevelOptions.includes(value),
      {
        message: "Choose a supported experience level."
      }
    )
    .optional()
})



export function getStoredProductContext(
  userId: string,
  storage: Storage | null = typeof window === "undefined" ? null : window.localStorage
) {
  if (!storage) {
    return defaultProductContext
  }

  try {
    const parsed = productContextSchema.safeParse(
      JSON.parse(
        storage.getItem(
          getUserScopedStorageKey(productContextStorageKey, userId)
        ) ?? "null"
      )
    )

    if (!parsed.success) {
      return defaultProductContext
    }

    const storedContext = {
      ...defaultProductContext,
      ...parsed.data
    }
    const isCurrentContextVersion =
      storedContext.schemaVersion === productContextSchemaVersion

    if (isCurrentContextVersion) {
      return storedContext
    }

    return {
      ...storedContext,
      schemaVersion: productContextSchemaVersion,
      roleMarket:
        storedContext.roleMarket === fallbackProductContext.roleMarket
          ? ""
          : storedContext.roleMarket,
      candidatePosition:
        storedContext.candidatePosition ===
        fallbackProductContext.candidatePosition
          ? ""
          : storedContext.candidatePosition,
      urgency:
        storedContext.urgency === fallbackProductContext.urgency
          ? ""
          : storedContext.urgency,
      targetCountry:
        storedContext.targetCountry === fallbackProductContext.targetCountry
          ? ""
          : storedContext.targetCountry,
      experienceLevel:
        storedContext.experienceLevel === fallbackProductContext.experienceLevel
          ? ""
          : storedContext.experienceLevel
    }
  } catch {
    return defaultProductContext
  }
}

export function saveProductContext(
  context: ProductContext,
  userId: string,
  storage: Storage = window.localStorage
) {
  storage.setItem(
    getUserScopedStorageKey(productContextStorageKey, userId),
    JSON.stringify({
      ...context,
      schemaVersion: productContextSchemaVersion
    })
  )
}
