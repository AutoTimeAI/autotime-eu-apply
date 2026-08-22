import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationWorkspace,
  JobAnalysisResult,
  JobRecord,
} from "./job-application-workflow";
import type { Database, Json } from "./supabase/types";

export const jobWorkflowServerSyncEnabled =
  process.env.AUTOTIME_JOB_WORKFLOW_SERVER_SYNC_ENABLED === "true";

export class JobWorkflowConflictError extends Error {
  constructor(kind: "job" | "application", id: string) {
    super(`This ${kind} changed elsewhere before this update was saved.`);
    this.name = "JobWorkflowConflictError";
    this.id = id;
  }
  id: string;
}

type JobRow = Database["public"]["Tables"]["job_workflow_jobs"]["Row"];
type ApplicationRow =
  Database["public"]["Tables"]["job_workflow_applications"]["Row"];
type AnalysisSnapshotRow =
  Database["public"]["Tables"]["job_workflow_analysis_snapshots"]["Row"];

function analysisFromSnapshotRow(row: AnalysisSnapshotRow): JobAnalysisResult {
  return {
    capability: row.capability as unknown as JobAnalysisResult["capability"],
    confidence: row.confidence as JobAnalysisResult["confidence"],
    coverage: row.coverage,
    createdAt: row.created_at,
    criticalRisk: row.critical_risk,
    decision: row.decision as JobAnalysisResult["decision"],
    id: row.id,
    nextAction: row.next_action,
    positiveEvidence: row.positive_evidence,
    reason: row.reason,
    unknowns: row.unknowns,
    version: row.version,
  };
}

function jobFromRow(row: JobRow, analysisHistory: JobAnalysisResult[]): JobRecord {
  return {
    atsPlatform: row.ats_platform ?? undefined,
    analysisHistory,
    analysisState: analysisHistory.length ? "Analysed" : "Not analysed",
    capturedAt: row.captured_at,
    description: row.description,
    employer: row.employer as unknown as JobRecord["employer"],
    facts: row.facts as unknown as JobRecord["facts"],
    id: row.id,
    lane: row.lane,
    source: row.source as JobRecord["source"],
    sourceUrl: row.source_url,
    title: row.title as unknown as JobRecord["title"],
    updatedAt: row.updated_at,
  };
}

function applicationFromRow(row: ApplicationRow): ApplicationWorkspace {
  return {
    appliedAt: row.applied_at ?? undefined,
    applicationChannel: row.application_channel ?? undefined,
    checklist: row.checklist,
    consequentialAnswersReviewed: row.consequential_answers_reviewed,
    coverLetter: row.cover_letter ?? undefined,
    coverLetterRequested: row.cover_letter_requested,
    createdAt: row.created_at,
    documentVersions: row.document_versions,
    evidenceConfirmed: row.evidence_confirmed,
    followUpDate: row.follow_up_date ?? undefined,
    id: row.id,
    jobId: row.job_id,
    referenceNumber: row.reference_number ?? undefined,
    screeningAnswers: [],
    selectedCvVersion: row.selected_cv_version,
    status: row.status as ApplicationWorkspace["status"],
    submissionConfirmed: row.submission_confirmed,
    unsupportedClaims: row.unsupported_claims,
    updatedAt: row.updated_at,
  };
}

export async function readJobWorkflow(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ jobs: JobRecord[]; applications: ApplicationWorkspace[] }> {
  const [jobsResult, applicationsResult, snapshotsResult] = await Promise.all([
    client
      .from("job_workflow_jobs")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    client
      .from("job_workflow_applications")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    client
      .from("job_workflow_analysis_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("version", { ascending: true }),
  ]);

  if (jobsResult.error || applicationsResult.error || snapshotsResult.error) {
    throw new Error("Job workflow read failed.");
  }

  const snapshotsByJobId = new Map<string, JobAnalysisResult[]>();
  for (const row of snapshotsResult.data ?? []) {
    const list = snapshotsByJobId.get(row.job_id) ?? [];
    list.push(analysisFromSnapshotRow(row));
    snapshotsByJobId.set(row.job_id, list);
  }

  const applications = (applicationsResult.data ?? []).map(applicationFromRow);
  const applicationIdByJobId = new Map(
    applications.map((application) => [application.jobId, application.id]),
  );

  const jobs = (jobsResult.data ?? []).map((row) => {
    const job = jobFromRow(row, snapshotsByJobId.get(row.id) ?? []);
    const applicationId = applicationIdByJobId.get(row.id);
    return applicationId ? { ...job, applicationId } : job;
  });

  return { jobs, applications };
}

export async function upsertJob(
  client: SupabaseClient<Database>,
  userId: string,
  job: JobRecord,
  expectedUpdatedAt: string | null,
): Promise<JobRecord> {
  const payload = {
    ats_platform: job.atsPlatform ?? null,
    description: job.description,
    employer: job.employer as unknown as Json,
    facts: job.facts as unknown as Json,
    id: job.id,
    lane: job.lane,
    source: job.source,
    source_url: job.sourceUrl,
    title: job.title as unknown as Json,
    updated_at: new Date().toISOString(),
    user_id: userId,
    captured_at: job.capturedAt,
  };

  const { data: existing } = await client
    .from("job_workflow_jobs")
    .select("updated_at")
    .eq("id", job.id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing && existing.updated_at !== expectedUpdatedAt)
    throw new JobWorkflowConflictError("job", job.id);
  if (!existing && expectedUpdatedAt !== null)
    throw new JobWorkflowConflictError("job", job.id);

  const query = existing
    ? client
        .from("job_workflow_jobs")
        .update(payload)
        .eq("id", job.id)
        .eq("user_id", userId)
        .eq("updated_at", existing.updated_at)
    : client.from("job_workflow_jobs").insert(payload);
  const { data, error } = await query.select("*").maybeSingle();

  if (error?.code === "23505" || (!error && !data))
    throw new JobWorkflowConflictError("job", job.id);
  if (error || !data) throw new Error("Job could not be saved.");

  await syncAnalysisSnapshots(client, userId, job);

  return jobFromRow(data, job.analysisHistory);
}

async function syncAnalysisSnapshots(
  client: SupabaseClient<Database>,
  userId: string,
  job: JobRecord,
): Promise<void> {
  if (!job.analysisHistory.length) return;
  const { data: existingVersions } = await client
    .from("job_workflow_analysis_snapshots")
    .select("version")
    .eq("job_id", job.id)
    .eq("user_id", userId);
  const knownVersions = new Set((existingVersions ?? []).map((row) => row.version));
  const missing = job.analysisHistory.filter(
    (analysis) => !knownVersions.has(analysis.version),
  );
  if (!missing.length) return;

  await client.from("job_workflow_analysis_snapshots").insert(
    missing.map((analysis) => ({
      id: analysis.id,
      user_id: userId,
      job_id: job.id,
      version: analysis.version,
      decision: analysis.decision,
      confidence: analysis.confidence,
      coverage: analysis.coverage,
      critical_risk: analysis.criticalRisk,
      next_action: analysis.nextAction,
      positive_evidence: analysis.positiveEvidence,
      reason: analysis.reason,
      capability: analysis.capability as unknown as Json,
      unknowns: analysis.unknowns,
      created_at: analysis.createdAt,
    })),
  );
}

export async function upsertApplication(
  client: SupabaseClient<Database>,
  userId: string,
  application: ApplicationWorkspace,
  expectedUpdatedAt: string | null,
): Promise<ApplicationWorkspace> {
  const payload = {
    id: application.id,
    user_id: userId,
    job_id: application.jobId,
    status: application.status,
    checklist: application.checklist,
    consequential_answers_reviewed: application.consequentialAnswersReviewed,
    cover_letter: application.coverLetter ?? null,
    cover_letter_requested: application.coverLetterRequested,
    document_versions: application.documentVersions,
    evidence_confirmed: application.evidenceConfirmed,
    follow_up_date: application.followUpDate ?? null,
    reference_number: application.referenceNumber ?? null,
    selected_cv_version: application.selectedCvVersion,
    submission_confirmed: application.submissionConfirmed,
    unsupported_claims: application.unsupportedClaims,
    applied_at: application.appliedAt ?? null,
    application_channel: application.applicationChannel ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("job_workflow_applications")
    .select("updated_at")
    .eq("id", application.id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing && existing.updated_at !== expectedUpdatedAt)
    throw new JobWorkflowConflictError("application", application.id);
  if (!existing && expectedUpdatedAt !== null)
    throw new JobWorkflowConflictError("application", application.id);

  const query = existing
    ? client
        .from("job_workflow_applications")
        .update(payload)
        .eq("id", application.id)
        .eq("user_id", userId)
        .eq("updated_at", existing.updated_at)
    : client.from("job_workflow_applications").insert(payload);
  const { data, error } = await query.select("*").maybeSingle();

  if (error?.code === "23505" || (!error && !data))
    throw new JobWorkflowConflictError("application", application.id);
  if (error || !data) throw new Error("Application could not be saved.");
  return applicationFromRow(data);
}

// Soft delete, not a real SQL delete: readJobWorkflow filters out rows with
// deleted_at set, so this leaves a tombstone rather than removing the row,
// which is what lets reconciliation on other devices/tabs learn the item is
// gone instead of silently re-adopting it from the server on the next sync.
// Deleting a job cascades the tombstone onto its own application (mirroring
// the real FK's `on delete cascade`), since an application whose job no
// longer exists locally isn't a state any client can meaningfully show.
export async function softDeleteJobWorkflowItems(
  client: SupabaseClient<Database>,
  userId: string,
  jobIds: string[],
  applicationIds: string[],
): Promise<{ deletedJobIds: string[]; deletedApplicationIds: string[] }> {
  const deletedAt = new Date().toISOString();
  const deletedJobIds: string[] = [];
  const deletedApplicationIds: string[] = [];

  if (jobIds.length) {
    const { data: cascaded } = await client
      .from("job_workflow_applications")
      .select("id")
      .eq("user_id", userId)
      .in("job_id", jobIds)
      .is("deleted_at", null);

    const { data: deletedJobs, error: jobError } = await client
      .from("job_workflow_jobs")
      .update({ deleted_at: deletedAt })
      .eq("user_id", userId)
      .in("id", jobIds)
      .is("deleted_at", null)
      .select("id");
    if (jobError) throw new Error("Jobs could not be deleted.");
    deletedJobIds.push(...(deletedJobs ?? []).map((row) => row.id));

    const cascadedIds = (cascaded ?? []).map((row) => row.id);
    if (cascadedIds.length) {
      const { data: cascadedApplications, error: cascadeError } = await client
        .from("job_workflow_applications")
        .update({ deleted_at: deletedAt })
        .eq("user_id", userId)
        .in("id", cascadedIds)
        .select("id");
      if (cascadeError) throw new Error("Applications could not be deleted.");
      deletedApplicationIds.push(
        ...(cascadedApplications ?? []).map((row) => row.id),
      );
    }
  }

  const remainingApplicationIds = applicationIds.filter(
    (id) => !deletedApplicationIds.includes(id),
  );
  if (remainingApplicationIds.length) {
    const { data, error } = await client
      .from("job_workflow_applications")
      .update({ deleted_at: deletedAt })
      .eq("user_id", userId)
      .in("id", remainingApplicationIds)
      .is("deleted_at", null)
      .select("id");
    if (error) throw new Error("Applications could not be deleted.");
    deletedApplicationIds.push(...(data ?? []).map((row) => row.id));
  }

  return { deletedJobIds, deletedApplicationIds };
}
