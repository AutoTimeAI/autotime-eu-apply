import type { z } from "zod"
import type {
  applicationContentDraftSchema,
  applicationContentSnapshotSchema,
  applicationRecordSchema,
  applicationStatusSchema,
  candidateProfileSchema,
  companionDashboardStateSchema,
  interviewPrepPackSchema,
  jobAnalysisDraftSchema,
  jobRecommendationSchema,
  reusableAnswersSchema,
  workModeSchema
} from "./schemas"

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>
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
export type InterviewPrepPack = z.infer<typeof interviewPrepPackSchema>
export type CompanionDashboardState = z.infer<
  typeof companionDashboardStateSchema
>
