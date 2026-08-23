import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterviewQuestion, InterviewRecord } from "./interview-workflow";
import type { Database, Json } from "./supabase/types";

export const interviewWorkflowServerSyncEnabled =
  process.env.AUTOTIME_INTERVIEW_WORKFLOW_SERVER_SYNC_ENABLED === "true";

export class InterviewWorkflowConflictError extends Error {
  constructor(id: string) {
    super("This interview changed elsewhere before this update was saved.");
    this.name = "InterviewWorkflowConflictError";
    this.id = id;
  }
  id: string;
}

type InterviewRow = Database["public"]["Tables"]["interview_records"]["Row"];
type QuestionRow = Database["public"]["Tables"]["interview_questions"]["Row"];

function questionFromRow(row: QuestionRow): InterviewQuestion {
  return {
    id: row.id,
    category: row.category as InterviewQuestion["category"],
    question: row.question,
    reason: row.reason,
    sourceReferences: row.source_references as unknown as InterviewQuestion["sourceReferences"],
    importance: row.importance as InterviewQuestion["importance"],
    evidenceStatus: row.evidence_status as InterviewQuestion["evidenceStatus"],
    answerDraft: (row.answer_draft as unknown as InterviewQuestion["answerDraft"]) ?? undefined,
    userConfidence: (row.user_confidence as InterviewQuestion["userConfidence"]) ?? undefined,
    markedForPractice: row.marked_for_practice,
    practiceSessions: row.practice_sessions as unknown as InterviewQuestion["practiceSessions"],
    origin: row.origin as InterviewQuestion["origin"],
    version: row.version,
    schemaVersion: "1",
  };
}

function questionToRow(
  question: InterviewQuestion,
  userId: string,
  interviewId: string,
): Database["public"]["Tables"]["interview_questions"]["Insert"] {
  return {
    id: question.id,
    user_id: userId,
    interview_id: interviewId,
    category: question.category,
    question: question.question,
    reason: question.reason,
    source_references: question.sourceReferences as unknown as Json,
    importance: question.importance,
    evidence_status: question.evidenceStatus,
    answer_draft: (question.answerDraft as unknown as Json) ?? null,
    user_confidence: question.userConfidence ?? null,
    marked_for_practice: question.markedForPractice ?? false,
    practice_sessions: (question.practiceSessions as unknown as Json) ?? [],
    origin: question.origin,
    version: question.version,
  };
}

function interviewFromRow(
  row: InterviewRow,
  questions: InterviewQuestion[],
  preparationHistory: InterviewRecord["preparationHistory"],
): InterviewRecord {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id,
    jobId: row.job_id,
    stage: row.stage as InterviewRecord["stage"],
    customStage: row.custom_stage ?? undefined,
    format: row.format as InterviewRecord["format"],
    scheduledAt: row.scheduled_at ?? undefined,
    timezone: row.timezone ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    locationOrMeetingNote: row.location_or_meeting_note ?? undefined,
    participantNotes: row.participant_notes ?? undefined,
    participants: row.participant_roles.map((role) => ({ role })),
    preparationNotes: row.preparation_notes ?? undefined,
    status: row.status as InterviewRecord["status"],
    outcome: row.outcome as InterviewRecord["outcome"],
    questions,
    preparationVersion: row.preparation_version,
    preparationHistory,
    finalReviewCompleted: row.final_review_completed,
    outcomeDetails: (row.outcome_details as unknown as InterviewRecord["outcomeDetails"]) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    schemaVersion: "1",
  };
}

export async function readInterviewWorkflow(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ interviews: InterviewRecord[] }> {
  const [interviewsResult, questionsResult, snapshotsResult] = await Promise.all([
    client.from("interview_records").select("*").eq("user_id", userId),
    client.from("interview_questions").select("*").eq("user_id", userId),
    client
      .from("interview_preparation_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("version", { ascending: true }),
  ]);

  if (interviewsResult.error || questionsResult.error || snapshotsResult.error) {
    throw new Error("Interview workflow read failed.");
  }

  const questionsByInterviewId = new Map<string, InterviewQuestion[]>();
  for (const row of questionsResult.data ?? []) {
    const list = questionsByInterviewId.get(row.interview_id) ?? [];
    list.push(questionFromRow(row));
    questionsByInterviewId.set(row.interview_id, list);
  }

  const preparationHistoryByInterviewId = new Map<
    string,
    InterviewRecord["preparationHistory"]
  >();
  for (const row of snapshotsResult.data ?? []) {
    const list = preparationHistoryByInterviewId.get(row.interview_id) ?? [];
    list.push({
      version: row.version,
      createdAt: row.created_at,
      questions: (row.questions as unknown as InterviewQuestion[]) ?? [],
    });
    preparationHistoryByInterviewId.set(row.interview_id, list);
  }

  const interviews = (interviewsResult.data ?? []).map((row) =>
    interviewFromRow(
      row,
      questionsByInterviewId.get(row.id) ?? [],
      preparationHistoryByInterviewId.get(row.id) ?? [],
    ),
  );

  return { interviews };
}

export async function upsertInterview(
  client: SupabaseClient<Database>,
  userId: string,
  interview: InterviewRecord,
  expectedUpdatedAt: string | null,
): Promise<InterviewRecord> {
  const payload = {
    id: interview.id,
    user_id: userId,
    application_id: interview.applicationId,
    job_id: interview.jobId,
    stage: interview.stage,
    custom_stage: interview.customStage ?? null,
    format: interview.format,
    scheduled_at: interview.scheduledAt ?? null,
    timezone: interview.timezone ?? null,
    duration_minutes: interview.durationMinutes ?? null,
    location_or_meeting_note: interview.locationOrMeetingNote ?? null,
    participant_notes: interview.participantNotes ?? null,
    participant_roles: interview.participants.map((participant) => participant.role),
    preparation_notes: interview.preparationNotes ?? null,
    status: interview.status,
    outcome: interview.outcome,
    preparation_version: interview.preparationVersion,
    final_review_completed: interview.finalReviewCompleted,
    outcome_details: (interview.outcomeDetails as unknown as Json) ?? null,
    updated_at: new Date().toISOString(),
    created_at: interview.createdAt,
  };

  // application_id and job_id only have to reference existing rows
  // somewhere (the FKs don't check ownership), so without this a caller
  // could link their own interview to another user's application/job -
  // not a read leak (readInterviewWorkflow still scopes by user_id), but
  // both FKs are "on delete cascade": the real owner deleting their own
  // application or job would then silently delete this unrelated interview
  // (and its questions/preparation snapshots, which cascade off it in turn).
  const [{ data: referencedApplication }, { data: referencedJob }] = await Promise.all([
    client
      .from("job_workflow_applications")
      .select("id")
      .eq("id", interview.applicationId)
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("job_workflow_jobs")
      .select("id")
      .eq("id", interview.jobId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!referencedApplication || !referencedJob) {
    throw new Error("Referenced application or job does not belong to this account.");
  }

  const { data: existing } = await client
    .from("interview_records")
    .select("updated_at")
    .eq("id", interview.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && existing.updated_at !== expectedUpdatedAt)
    throw new InterviewWorkflowConflictError(interview.id);
  if (!existing && expectedUpdatedAt !== null)
    throw new InterviewWorkflowConflictError(interview.id);

  const query = existing
    ? client
        .from("interview_records")
        .update(payload)
        .eq("id", interview.id)
        .eq("user_id", userId)
        .eq("updated_at", existing.updated_at)
    : client.from("interview_records").insert(payload);
  const { data, error } = await query.select("*").maybeSingle();

  if (error?.code === "23505" || (!error && !data))
    throw new InterviewWorkflowConflictError(interview.id);
  if (error || !data) throw new Error("Interview could not be saved.");

  await syncQuestions(client, userId, interview);
  await syncPreparationSnapshots(client, userId, interview);

  return interviewFromRow(data, interview.questions, interview.preparationHistory);
}

// interview_questions has no updated_at/CAS of its own - the interview
// record's updated_at is the single concurrency token for the whole
// interview, including its questions (see the module comment). The local
// reducers always replace `questions` as a whole array on every mutation,
// so this mirrors that at the DB layer: drop rows no longer present, then
// upsert every current question by its deterministic stableId().
async function syncQuestions(
  client: SupabaseClient<Database>,
  userId: string,
  interview: InterviewRecord,
): Promise<void> {
  const currentIds = new Set(interview.questions.map((question) => question.id));

  const { data: existingRows } = await client
    .from("interview_questions")
    .select("id")
    .eq("interview_id", interview.id)
    .eq("user_id", userId);
  const staleIds = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !currentIds.has(id));

  // Supabase-js does not throw on a write failure by default - an
  // unchecked delete/upsert here would let the outer upsertInterview()
  // report success while the question rows silently drift out of sync
  // with interview_records.updated_at, the sole CAS token for the whole
  // interview (see the module comment above), with no way for the client
  // to detect the mismatch.
  if (staleIds.length) {
    const { error } = await client
      .from("interview_questions")
      .delete()
      .eq("interview_id", interview.id)
      .eq("user_id", userId)
      .in("id", staleIds);
    if (error) throw new Error("Stale interview questions could not be removed.");
  }

  if (!interview.questions.length) return;

  const { error } = await client
    .from("interview_questions")
    .upsert(
      interview.questions.map((question) => questionToRow(question, userId, interview.id)),
    );
  if (error) throw new Error("Interview questions could not be saved.");
}

async function syncPreparationSnapshots(
  client: SupabaseClient<Database>,
  userId: string,
  interview: InterviewRecord,
): Promise<void> {
  if (!interview.preparationHistory.length) return;
  const { data: existingVersions } = await client
    .from("interview_preparation_snapshots")
    .select("version")
    .eq("interview_id", interview.id)
    .eq("user_id", userId);
  const knownVersions = new Set((existingVersions ?? []).map((row) => row.version));
  const missing = interview.preparationHistory.filter(
    (snapshot) => !knownVersions.has(snapshot.version),
  );
  if (!missing.length) return;

  const { error } = await client.from("interview_preparation_snapshots").insert(
    missing.map((snapshot) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      interview_id: interview.id,
      version: snapshot.version,
      questions: snapshot.questions as unknown as Json,
      created_at: snapshot.createdAt,
    })),
  );
  if (error) throw new Error("Interview preparation snapshot could not be saved.");
}
