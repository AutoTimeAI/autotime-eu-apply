import { z } from "zod"

const flexibleStringListToStringSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean).join(", ")
      : value
  )

export const applicationStatusSchema = z.enum([
  "Saved",
  "Checking fit",
  "Ready to apply",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Archived"
])

export const applicationOutcomeReasonSchema = z.enum([
  "Unknown",
  "Interview secured",
  "Offer or final stage",
  "No response",
  "Sponsorship blocker",
  "Work-right blocker",
  "Skill mismatch",
  "Location mismatch",
  "Role closed"
])

export const jobRecommendationSchema = z.enum([
  "High Priority",
  "Worth Applying",
  "Stretch",
  "Skip"
])

export const workModeSchema = z.enum([
  "onsite",
  "hybrid",
  "remote",
  "unknown"
])

export const aiProviderSchema = z.enum(["mock", "openai", "anthropic"])

export const normalisedJobSchema = z.object({
  sourceType: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string(),
  title: z.string(),
  company: z.string(),
  country: z.string(),
  city: z.string(),
  locationType: z.enum(["onsite", "hybrid", "remote", "unknown"]),
  description: z.string(),
  responsibilities: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string(),
  languageSignals: z.array(z.string()),
  sponsorshipSignals: z.array(z.string()),
  rightToWorkSignals: z.array(z.string()),
  relocationSignals: z.array(z.string()),
  seniority: z.string(),
  employerType: z.string(),
  extractedAt: z.string(),
  verificationStatus: z.enum([
    "not_checked",
    "needs_official_check",
    "user_verified",
    "source_verified"
  ])
})

export const candidateReadinessProfileSchema = z.object({
  currentLocation: z.string(),
  workAuthorisationStatus: z.string(),
  sponsorshipNeed: z.boolean(),
  targetCountries: z.array(z.string()),
  languages: z.array(z.string()),
  yearsOfExperience: z.number().nullable(),
  targetRoles: z.array(z.string()),
  salaryMinimum: z.number().nullable(),
  relocationReadiness: z.enum(["yes", "no", "depends", "unknown"]),
  noticePeriod: z.string(),
  strongestDomainExperience: z.string(),
  cvStrengthLevel: z.enum(["missing", "thin", "developing", "strong"]),
  linkedInOrPortfolioAvailability: z.enum([
    "missing",
    "linkedin_only",
    "portfolio_only",
    "both"
  ])
})

export const fitComponentStatusSchema = z.enum([
  "strong",
  "medium",
  "weak",
  "blocker"
])

export const fitComponentKeySchema = z.enum([
  "skillMatch",
  "atsCompatibility",
  "sponsorshipLikelihood",
  "rightToWorkCompatibility",
  "relocationFit",
  "countryLocationFit"
])

export const fitComponentSchema = z.object({
  key: fitComponentKeySchema,
  label: z.string(),
  score: z.number(),
  status: fitComponentStatusSchema,
  rationale: z.string(),
  evidence: z.array(z.string())
})

export const countryFitDecisionSchema = z.enum([
  "Apply now",
  "Stretch application",
  "Skip for now",
  "Improve profile first"
])

export const contentGenerationGateSchema = z.enum([
  "ready",
  "stretch",
  "blocked"
])

export const autoTimeFitLabelSchema = z.enum([
  "Strong fit",
  "Good fit",
  "Stretch fit",
  "Low fit"
])

export const autoTimeScoreBreakdownItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  maxPoints: z.number(),
  points: z.number(),
  rationale: z.string()
})

export const autoTimeFitReviewSchema = z.object({
  fitScore: z.number(),
  fitLabel: autoTimeFitLabelSchema,
  confidenceLevel: z.enum(["Low", "Medium", "High"]),
  scoreBreakdown: z.array(autoTimeScoreBreakdownItemSchema),
  matchedSignals: z.array(z.string()),
  missingSignals: z.array(z.string()),
  riskAreas: z.array(z.string()),
  suggestedCvPositioning: z.string(),
  suggestedNextAction: z.string(),
  shortSummary: z.string(),
  disclaimer: z.string()
})

export const countryFitEvaluationSchema = z.object({
  overallScore: z.number(),
  decision: countryFitDecisionSchema,
  confidence: z.enum(["Low", "Medium", "High"]),
  contentGate: contentGenerationGateSchema,
  countryRule: z.object({
    code: z.string(),
    name: z.string(),
    marketNote: z.string(),
    sponsorshipStrictness: z.enum(["open", "mixed", "strict"]),
    relocationFriction: z.enum(["low", "medium", "high"])
  }),
  positioningAngle: z.string(),
  nextBestAction: z.string(),
  blockers: z.array(z.string()),
  evidenceChecklist: z.array(z.string()),
  components: z.array(fitComponentSchema),
  learningPrompt: z.string()
})

export const euFitEngineResultSchema = z.object({
  euFitScore: z.number(),
  applyDecision: countryFitDecisionSchema,
  bestCountryFit: z.string(),
  applicationPriority: jobRecommendationSchema,
  rightToWorkRealityCheck: z.string(),
  languageBarrierScore: z.number(),
  relocationPracticality: z.string(),
  officialVerificationStatus: z.enum([
    "not_checked",
    "needs_official_check",
    "user_verified",
    "source_verified"
  ]),
  positiveSignals: z.array(z.string()),
  riskSignals: z.array(z.string()),
  whyThisRoleFits: z.array(z.string()),
  candidatePositioningGap: z.string(),
  bestApplicationAngle: z.string(),
  recruiterSummaryAngle: z.string(),
  cvImprovementSuggestion: z.string(),
  interviewReadinessNote: z.string(),
  trustNote: z.string(),
  complianceNote: z.string()
})

export const applicationPositioningPackSchema = z.object({
  recruiterSummaryAngle: z.string(),
  bestApplicationAngle: z.string(),
  cvImprovementSuggestion: z.string(),
  coverLetterAngle: z.string(),
  motivationAnswerAngle: z.string(),
  strengthsAnswerAngle: z.string(),
  interviewReadinessNote: z.string(),
  followUpSuggestion: z.string(),
  trustNote: z.string(),
  complianceNote: z.string()
})

export const candidateProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  linkedInUrl: z.string(),
  githubUrl: z.string(),
  portfolioUrl: z.string(),
  currentCountry: z.string(),
  currentCity: z.string(),
  targetCountries: z.string(),
  targetRoles: flexibleStringListToStringSchema,
  workRightDetails: z.string(),
  sponsorshipNeeded: z.boolean(),
  relocationWillingness: z.enum(["yes", "no", "depends"]),
  salaryExpectation: z.string(),
  noticePeriod: z.string(),
  baseCvText: z.string(),
  projectSummaries: z.string(),
  experienceHighlights: z.string()
})

export const reusableAnswersSchema = z.object({
  sponsorshipAnswer: z.string(),
  relocationAnswer: z.string(),
  workAuthorisationAnswer: z.string(),
  noticePeriodAnswer: z.string(),
  salaryExpectationAnswer: z.string(),
  motivationAnswer: z.string(),
  strengthsAnswer: z.string(),
  availabilityAnswer: z.string()
})

export const applicationContentDraftSchema = z.object({
  coverLetter: z.string(),
  profileSummary: z.string(),
  motivationAnswer: z.string(),
  strengthsAnswer: z.string(),
  availabilityAnswer: z.string()
})

export const applicationContentSnapshotSchema =
  applicationContentDraftSchema.extend({
    savedAt: z.string()
  })

export const jobAnalysisDraftSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  jobUrl: z.string(),
  location: z.string(),
  workMode: workModeSchema,
  jobDescription: z.string(),
  notes: z.string(),
  skills: z.array(z.string()).optional(),
  seniority: z.string().optional(),
  summary: z.string().optional(),
  gaps: z.array(z.string()).optional(),
  fitScore: z.number().optional(),
  fitLabel: autoTimeFitLabelSchema.optional(),
  confidenceLevel: z.enum(["Low", "Medium", "High"]).optional(),
  scoreBreakdown: z.array(autoTimeScoreBreakdownItemSchema).optional(),
  matchedSignals: z.array(z.string()).optional(),
  missingSignals: z.array(z.string()).optional(),
  riskAreas: z.array(z.string()).optional(),
  suggestedCvPositioning: z.string().optional(),
  suggestedNextAction: z.string().optional(),
  shortSummary: z.string().optional(),
  disclaimer: z.string().optional(),
  recommendation: jobRecommendationSchema.optional(),
  positioningAngle: z.string().optional(),
  scoreFactors: z.array(z.string()).optional()
})

export const applicationRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  company: z.string().optional(),
  roleTitle: z.string().optional(),
  source: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  status: applicationStatusSchema,
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  notes: z.string().optional(),
  outcomeReason: applicationOutcomeReasonSchema.optional(),
  fitScore: z.number().optional(),
  fitLabel: autoTimeFitLabelSchema.optional(),
  confidenceLevel: z.enum(["Low", "Medium", "High"]).optional(),
  scoreBreakdown: z.array(autoTimeScoreBreakdownItemSchema).optional(),
  matchedSignals: z.array(z.string()).optional(),
  missingSignals: z.array(z.string()).optional(),
  riskAreas: z.array(z.string()).optional(),
  suggestedCvPositioning: z.string().optional(),
  suggestedNextAction: z.string().optional(),
  shortSummary: z.string().optional(),
  disclaimer: z.string().optional(),
  fitDecision: countryFitDecisionSchema.optional(),
  contentGate: contentGenerationGateSchema.optional(),
  contentSnapshot: applicationContentSnapshotSchema.optional()
})

export const evidenceSourceTypeSchema = z.enum([
  "profile",
  "cv",
  "job_text",
  "user_answer",
  "official_source",
  "system_rule"
])

export const evidenceRecordSchema = z.object({
  id: z.string(),
  applicationId: z.string().optional(),
  jobUrl: z.string().optional(),
  checkKey: z.string(),
  checkLabel: z.string(),
  status: z.enum(["found", "missing", "risk", "limit"]),
  evidenceText: z.string(),
  sourceType: evidenceSourceTypeSchema,
  sourceLabel: z.string(),
  missingInput: z.string().optional(),
  riskFlag: z.string().optional(),
  explanation: z.string(),
  limit: z.string(),
  createdAt: z.string()
})

export const outcomeRecordSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  roleTitle: z.string(),
  company: z.string().optional(),
  country: z.string().optional(),
  source: z.string().optional(),
  status: applicationStatusSchema,
  outcomeReason: applicationOutcomeReasonSchema,
  decisionIndexAtSave: z.number().optional(),
  decisionLabelAtSave: countryFitDecisionSchema.optional(),
  contentGateAtSave: contentGenerationGateSchema.optional(),
  appliedAt: z.string().optional(),
  interviewAt: z.string().optional(),
  closedAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const interviewPrepPackSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  roleSummary: z.string(),
  positioningStatement: z.string(),
  fitAndGapRecap: z.string(),
  likelyQuestions: z.array(z.string()),
  starAnswerPrompts: z.array(z.string()),
  projectTalkingPoints: z.array(z.string()),
  skillsToRevise: z.array(z.string()),
  questionsToAskEmployer: z.array(z.string()),
  finalPrepChecklist: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const companionDashboardStateSchema = z.object({
  profile: candidateProfileSchema,
  reusableAnswers: reusableAnswersSchema,
  jobAnalysis: jobAnalysisDraftSchema,
  applications: z.array(applicationRecordSchema),
  interviewPrepPacks: z.array(interviewPrepPackSchema),
  evidenceRecords: z.array(evidenceRecordSchema).optional(),
  outcomeRecords: z.array(outcomeRecordSchema).optional()
})
