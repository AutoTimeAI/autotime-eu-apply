// Zod schemas for every persisted/synced domain object in AutoTime EU Apply:
// candidate profile, job analysis, fit/positioning results, application
// records, evidence, outcomes, and the aggregate dashboard state. These are
// the runtime validators that guard the boundary between the extension's
// local-first storage, the web app's cloud sync (Supabase), and AI-generated
// content, so both apps parse/validate against the exact same shapes.
// `types.ts` derives its exported TS types from these via `z.infer`, so this
// file is the single source of truth - edit schemas here, not the types.
import { z } from "zod"

// Accepts either a comma-joined string or a string array for list-like text
// fields (used by candidateProfileSchema.targetRoles) and always normalises
// the stored value back down to a single trimmed, comma-joined string. This
// lets both apps write list data without agreeing on one input shape.
const flexibleStringListToStringSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean).join(", ")
      : value
  )

/** Lifecycle stage of a single tracked job application. */
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

/** Why an application ended up in its current outcome state; feeds the outcome-learning signals in fit-model.ts. */
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

/** Coarse apply/skip guidance bucket derived from a fit score. */
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

/** Which AI backend produced (or should produce) generated content; "mock" is the offline/no-API-key fallback. */
export const aiProviderSchema = z.enum(["mock", "openai", "anthropic"])

/**
 * A job posting scraped/parsed off a job board or ATS page (extension
 * content-script capture), before any candidate-specific fit scoring is
 * applied. `*Signals` arrays hold raw phrases detected in the posting text
 * that country-rules.ts and fit-model.ts later interpret.
 */
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

/**
 * A structured, AI/derived summary of how ready a candidate is to apply
 * abroad - distinct from candidateProfileSchema (the raw user-entered
 * profile). Used where a normalised readiness snapshot is needed rather
 * than free-text profile fields.
 */
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

/** Traffic-light strength rating for one fit component (see fitComponentKeySchema). */
export const fitComponentStatusSchema = z.enum([
  "strong",
  "medium",
  "weak",
  "blocker"
])

/** The fixed set of sub-scores that make up a legacy country-fit evaluation (see evaluateCountryFit in fit-model.ts). */
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

/** Apply/skip guidance for a specific target country, as produced by the legacy evaluateCountryFit engine. */
export const countryFitDecisionSchema = z.enum([
  "Apply now",
  "Stretch application",
  "Skip for now",
  "Improve profile first"
])

/** Whether AI content generation (cover letters, answers, etc.) is allowed to proceed for this job/country pairing. */
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

/**
 * Full output of evaluateAutoTimeFitScore (see fit-model.ts): the role/skill
 * fit score, its weighted breakdown, and the matched/missing/risk signal
 * lists surfaced to the candidate.
 */
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

/**
 * @deprecated Mirrors the return shape of the deprecated evaluateCountryFit
 * (fit-model.ts). Prefer InternationalAssessment (international/types.ts)
 * plus orchestrateJobDecision for new country/work-right decisions.
 */
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

/**
 * Combined EU-fit summary shown to the candidate for a single job: fit
 * score, apply decision, sponsorship/relocation/language reality checks, and
 * the trust/compliance disclaimers required alongside any AI-assisted
 * output. Produced by createMockEUFitEngineResult in fit-model.ts (or an AI
 * provider following the same contract).
 */
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

/** Ready-to-use application angles (cover letter, motivation, strengths, etc.) derived from a fit result. */
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

/**
 * The user's own profile as entered in onboarding: identity/contact info,
 * work-right/sponsorship situation, and free-text CV evidence. This is the
 * primary input to fit-model.ts scoring and to
 * international/migration.ts's conversion into a MobilityProfile.
 * `targetRoles` accepts a string or array on input (flexibleStringListToStringSchema)
 * but is always stored as a single comma-joined string.
 */
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

/** Candidate's saved stock answers to recurring application questions, reused across jobs to avoid re-writing them each time. */
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

/** Draft AI/template-generated application content before it has been saved/submitted. */
export const applicationContentDraftSchema = z.object({
  coverLetter: z.string(),
  profileSummary: z.string(),
  motivationAnswer: z.string(),
  strengthsAnswer: z.string(),
  availabilityAnswer: z.string()
})

/** A content draft frozen at the point it was saved to an application record, with a timestamp for audit/history. */
export const applicationContentSnapshotSchema =
  applicationContentDraftSchema.extend({
    savedAt: z.string()
  })

/**
 * Working state for a single job the candidate is currently analysing:
 * captured posting fields plus the (optional) fit-scoring output once
 * evaluateAutoTimeFitScore has run. All scoring fields are optional because
 * this schema also represents the pre-analysis state.
 */
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

/**
 * A persisted, tracked job application: identity/source fields, current
 * status, and a snapshot of the fit/positioning data at save time. This is
 * the row shape stored per-application in local storage (extension) and
 * synced to the cloud (web app), so it's intentionally denormalised
 * (duplicates jobAnalysisDraftSchema's scoring fields) rather than
 * referencing a job record.
 */
export const applicationRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  company: z.string().optional(),
  roleTitle: z.string().optional(),
  source: z.string().optional(),
  atsPlatform: z.string().optional(),
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

/** Where a piece of supporting evidence for a decision came from (used to keep AI/rule output traceable to a real source). */
export const evidenceSourceTypeSchema = z.enum([
  "profile",
  "cv",
  "job_text",
  "user_answer",
  "official_source",
  "system_rule"
])

/**
 * One auditable evidence entry backing a specific check (e.g. "sponsorship
 * confirmed") - what was checked, whether it was found, where it came from,
 * and the stated limit of what that evidence can prove. Used to keep
 * AI-assisted claims traceable and honest rather than asserted outright.
 */
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

/**
 * What actually happened for a tracked application (interview, rejection,
 * etc.), recorded alongside the decision context that was in effect when it
 * was saved. This is the feedback loop that lets fit-model.ts's outcome
 * learning signals (sponsorshipBlocks, workRightBlocks, ...) become stricter
 * over time.
 */
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

/** A generated interview-prep pack for one application: likely questions, talking points, and a final checklist. */
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

/**
 * The full companion-dashboard state: everything needed to reconstruct a
 * candidate's session in one object. This is the top-level shape synced
 * between the extension's local storage and the web app's cloud storage
 * (see apps/web/lib/cloud-sync.ts and apps/extension/lib/v2-dashboard.ts).
 */
export const companionDashboardStateSchema = z.object({
  profile: candidateProfileSchema,
  reusableAnswers: reusableAnswersSchema,
  jobAnalysis: jobAnalysisDraftSchema,
  applications: z.array(applicationRecordSchema),
  interviewPrepPacks: z.array(interviewPrepPackSchema),
  evidenceRecords: z.array(evidenceRecordSchema).optional(),
  outcomeRecords: z.array(outcomeRecordSchema).optional()
})
