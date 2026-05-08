import { z } from "zod"

export const applicationStatusSchema = z.enum([
  "Saved",
  "Applying",
  "Applied",
  "Interview",
  "Rejected",
  "Closed"
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
  rationale: z.string()
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

export const countryFitEvaluationSchema = z.object({
  overallScore: z.number(),
  decision: countryFitDecisionSchema,
  confidence: z.enum(["Low", "Medium", "High"]),
  contentGate: contentGenerationGateSchema,
  positioningAngle: z.string(),
  nextBestAction: z.string(),
  blockers: z.array(z.string()),
  components: z.array(fitComponentSchema),
  learningPrompt: z.string()
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
  targetRoles: z.string(),
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
  status: applicationStatusSchema,
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  notes: z.string().optional(),
  fitScore: z.number().optional(),
  fitDecision: countryFitDecisionSchema.optional(),
  contentGate: contentGenerationGateSchema.optional(),
  contentSnapshot: applicationContentSnapshotSchema.optional()
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
  interviewPrepPacks: z.array(interviewPrepPackSchema)
})
