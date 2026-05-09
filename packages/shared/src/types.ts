import type { z } from "zod"
import type {
  applicationContentDraftSchema,
  applicationContentSnapshotSchema,
  applicationOutcomeReasonSchema,
  applicationRecordSchema,
  applicationStatusSchema,
  candidateProfileSchema,
  companionDashboardStateSchema,
  evidenceRecordSchema,
  evidenceSourceTypeSchema,
  interviewPrepPackSchema,
  jobAnalysisDraftSchema,
  jobRecommendationSchema,
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
