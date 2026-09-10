export type InterviewBuddyOutputKey =
  | "professionalAnswer"
  | "naturalAnswer"
  | "lightFunnyAnswer"
  | "strongFinalAnswer"

export type InterviewBuddyOutputs = Record<InterviewBuddyOutputKey, string>

export type InterviewCoachMeta = {
  evidenceScore: number
  riskFlags: string[]
  missingEvidence: string[]
  followUpDrills: string[]
  boundaryNote: string
  source: "ai" | "local"
}
