import { z } from "zod";
import type { InterviewRecord } from "./interview-workflow";

// Pure reconciliation/wire-schema logic for syncing Interviews
// (interview-workflow.ts) with the cloud tables added in the
// job_workflow_and_interviews migration (issue #29). No DOM/fetch
// dependency here - see interview-workflow-repository.ts for the server
// side and useInterviewWorkflowSync.ts for the client hook that calls this.
//
// Mirrors job-workflow-sync.ts's reconciliation model: per-record
// last-write-wins by `updatedAt`, no manual "keep local vs keep server" UI.
// Unlike Jobs/Applications, InterviewWorkflowState holds a single
// `interviews` array, so only one reconciliation pass is needed here.
//
// The interview record's own `updatedAt` is the single concurrency token
// for the whole record, including its nested `questions` and
// `preparationHistory` - interview-workflow.ts's reducers always replace
// both as whole arrays on every mutation, so per-question or per-snapshot
// optimistic concurrency would not reflect how the app actually writes
// (see the matching comment on interview_records in the migration).

const interviewSourceReferenceSchema = z.object({
  id: z.string(),
  kind: z.enum(["requirement", "application", "evidence", "stage", "gap"]),
  label: z.string(),
  confirmed: z.boolean(),
});

const interviewAnswerSchema = z.object({
  draft: z.string(),
  userEdited: z.string(),
  evidenceIds: z.array(z.string()),
  assumptions: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  confirmed: z.boolean(),
  status: z.enum(["Not started", "Drafted", "Needs evidence", "Reviewed", "Ready"]),
  structure: z.enum(["STAR-L", "technical", "direct"]),
  versions: z.array(z.object({ value: z.string(), savedAt: z.string() })),
});

const practiceSessionSchema = z.object({
  id: z.string(),
  mode: z.literal("typed"),
  startedAt: z.string(),
  submittedAt: z.string(),
  timeLimitSeconds: z.number(),
  responseText: z.string(),
});

export const interviewQuestionWireSchema = z.object({
  id: z.string(),
  category: z.enum([
    "motivation",
    "experience",
    "behavioural",
    "technical",
    "scenario",
    "stakeholder",
    "job_risk",
    "employer_questions",
  ]),
  question: z.string(),
  reason: z.string(),
  sourceReferences: z.array(interviewSourceReferenceSchema),
  importance: z.enum(["high", "medium", "low"]),
  evidenceStatus: z.enum(["strong", "partial", "missing", "not_required"]),
  answerDraft: interviewAnswerSchema.optional(),
  userConfidence: z.enum(["not_started", "low", "medium", "high"]).optional(),
  markedForPractice: z.boolean().optional(),
  practiceSessions: z.array(practiceSessionSchema).optional(),
  origin: z.enum([
    "deterministic",
    "interview_bank",
    "job_requirement",
    "evidence_gap",
    "ai",
  ]),
  version: z.number().int().min(1),
  schemaVersion: z.literal("1"),
});

const interviewOutcomeDetailsSchema = z.object({
  questionsAsked: z.array(z.string()),
  difficultAreas: z.array(z.string()),
  notes: z.string(),
  followUpAction: z.string(),
  outcomeCheckDate: z.string().optional(),
  employerConfirmedReason: z.string().optional(),
  userInterpretation: z.string().optional(),
  learningSignals: z.array(
    z.enum([
      "technical_gap",
      "unclear_evidence",
      "salary_mismatch",
      "sponsorship_issue",
      "role_level_mismatch",
      "story_weakness",
      "unknown",
    ]),
  ),
});

export const interviewRecordWireSchema = z.object({
  id: z.string(),
  userId: z.string(),
  applicationId: z.string(),
  jobId: z.string(),
  stage: z.enum([
    "recruiter_screen",
    "hiring_manager",
    "technical",
    "case_study",
    "behavioural",
    "panel",
    "final",
    "other",
  ]),
  customStage: z.string().optional(),
  format: z.enum(["phone", "video", "onsite", "take_home", "unknown"]),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
  durationMinutes: z.number().optional(),
  locationOrMeetingNote: z.string().optional(),
  participantNotes: z.string().optional(),
  participants: z.array(z.object({ role: z.string() })),
  preparationNotes: z.string().optional(),
  status: z.enum(["scheduled", "preparing", "ready", "completed", "cancelled"]),
  outcome: z.enum([
    "awaiting",
    "progressed",
    "offer",
    "rejected",
    "withdrawn",
    "cancelled",
    "no_response",
  ]),
  questions: z.array(interviewQuestionWireSchema),
  preparationVersion: z.number().int().min(1),
  preparationHistory: z.array(
    z.object({
      version: z.number().int().min(1),
      createdAt: z.string(),
      questions: z.array(interviewQuestionWireSchema),
    }),
  ),
  finalReviewCompleted: z.boolean(),
  outcomeDetails: interviewOutcomeDetailsSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.literal("1"),
});

export const interviewWorkflowApiResponseSchema = z.object({
  data: z.object({ interviews: z.array(interviewRecordWireSchema) }).nullable(),
  error: z.string().nullable(),
});

export type InterviewWorkflowServerState = { interviews: InterviewRecord[] };

export const interviewWorkflowUploadRequestSchema = z.object({
  interviews: z.array(
    z.object({
      interview: interviewRecordWireSchema,
      expectedUpdatedAt: z.string().nullable(),
    }),
  ),
});

function laterOf(a: string, b: string): "a" | "b" {
  return new Date(a).getTime() >= new Date(b).getTime() ? "a" : "b";
}

export type InterviewWorkflowReconciliation = {
  interviews: InterviewRecord[];
  interviewsToUpload: { interview: InterviewRecord; expectedUpdatedAt: string | null }[];
};

// Per-record reconciliation by id, last-write-wins by updatedAt - see
// reconcileJobWorkflow in job-workflow-sync.ts, which this mirrors.
export function reconcileInterviewWorkflow({
  localInterviews,
  server,
}: {
  localInterviews: InterviewRecord[];
  server: InterviewWorkflowServerState | null;
}): InterviewWorkflowReconciliation {
  const serverInterviewsById = new Map(
    (server?.interviews ?? []).map((interview) => [interview.id, interview]),
  );
  const localInterviewsById = new Map(
    localInterviews.map((interview) => [interview.id, interview]),
  );

  const interviews: InterviewRecord[] = [];
  const interviewsToUpload: InterviewWorkflowReconciliation["interviewsToUpload"] = [];
  const allInterviewIds = new Set([
    ...localInterviewsById.keys(),
    ...serverInterviewsById.keys(),
  ]);
  for (const id of allInterviewIds) {
    const local = localInterviewsById.get(id);
    const remote = serverInterviewsById.get(id);
    if (local && !remote) {
      interviews.push(local);
      interviewsToUpload.push({ interview: local, expectedUpdatedAt: null });
    } else if (!local && remote) {
      interviews.push(remote);
    } else if (local && remote) {
      if (laterOf(local.updatedAt, remote.updatedAt) === "a") {
        interviews.push(local);
        if (local.updatedAt !== remote.updatedAt)
          interviewsToUpload.push({ interview: local, expectedUpdatedAt: remote.updatedAt });
      } else {
        interviews.push(remote);
      }
    }
  }

  return { interviews, interviewsToUpload };
}
