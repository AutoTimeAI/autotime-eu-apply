// TypeScript types for the schemas.ts domain objects, derived with z.infer
// so the compile-time types can never drift from the runtime validators.
// This is the file both apps actually import for type annotations (via the
// `export type *` re-export in index.ts) - schemas.ts stays the source of
// truth, this file just exposes its shapes to TS without pulling in zod at
// type-only call sites.
import type { z } from "zod"
import type {
  applicationContentDraftSchema,
  applicationContentSnapshotSchema,
  applicationOutcomeReasonSchema,
  applicationPositioningPackSchema,
  applicationRecordSchema,
  applicationStatusSchema,
  aiProviderSchema,
  candidateReadinessProfileSchema,
  candidateProfileSchema,
  companionDashboardStateSchema,
  euFitEngineResultSchema,
  evidenceRecordSchema,
  evidenceSourceTypeSchema,
  interviewPrepPackSchema,
  jobAnalysisDraftSchema,
  jobRecommendationSchema,
  normalisedJobSchema,
  outcomeRecordSchema,
  reusableAnswersSchema,
  workModeSchema
} from "./schemas.ts"

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>
export type ApplicationOutcomeReason = z.infer<
  typeof applicationOutcomeReasonSchema
>
export type JobRecommendation = z.infer<typeof jobRecommendationSchema>
export type WorkMode = z.infer<typeof workModeSchema>
export type AIProvider = z.infer<typeof aiProviderSchema>
export type NormalisedJob = z.infer<typeof normalisedJobSchema>
export type CandidateReadinessProfile = z.infer<
  typeof candidateReadinessProfileSchema
>
export type EUFitEngineResult = z.infer<typeof euFitEngineResultSchema>
export type ApplicationPositioningPack = z.infer<
  typeof applicationPositioningPackSchema
>
export type CandidateProfile = z.infer<typeof candidateProfileSchema>
export type ReusableAnswers = z.infer<typeof reusableAnswersSchema>
export type ApplicationContentDraft = z.infer<
  typeof applicationContentDraftSchema
>
export type ApplicationContentSnapshot = z.infer<
  typeof applicationContentSnapshotSchema
>
export type JobAnalysisDraft = z.infer<typeof jobAnalysisDraftSchema>
export type ApplicationRecord = z.infer<typeof applicationRecordSchema>
export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>
export type OutcomeRecord = z.infer<typeof outcomeRecordSchema>
export type InterviewPrepPack = z.infer<typeof interviewPrepPackSchema>
export type CompanionDashboardState = z.infer<
  typeof companionDashboardStateSchema
>
