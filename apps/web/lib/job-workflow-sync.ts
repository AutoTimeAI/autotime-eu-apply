import { z } from "zod";
import type { ApplicationWorkspace, JobRecord } from "./job-application-workflow";

// Pure reconciliation/wire-schema logic for syncing Jobs/Applications
// (job-application-workflow.ts) with the cloud tables added in the
// job_workflow_and_interviews migration (issue #29). No DOM/fetch
// dependency here - see job-workflow-repository.ts for the server side and
// useJobWorkflowSync.ts for the client hook that calls this.
//
// Deliberately out of scope for this pass (see issue #29):
// - ScreeningAnswer sync: nothing in the app currently reads or writes
//   screeningAnswers, so it always round-trips as an empty array. The
//   job_workflow_screening_answers table exists for when that changes.
// - JobRecord.skipReason: declared on the type but never read or written
//   anywhere in the app today - not synced, always undefined.
// - JobRecord.applicationId is NOT a stored column (no data to lose): it's
//   derived server-side from which application's job_id matches, since
//   that's the authoritative direction of the relationship.
//
// Conflict handling is intentionally simpler than the mobility profile sync
// this is modelled on: last-write-wins by `updatedAt`, no manual "keep
// local vs keep server" UI. Job/application tracking data doesn't carry the
// same sensitivity as mobility/immigration status, and every mutation in
// this feature already replaces the whole local JobWorkflowState on every
// change, so per-field merging would not reflect how the app actually
// writes.

export const sourcedValueSchema = z.object({
  state: z.enum(["extracted", "user-confirmed", "missing", "conflicting"]),
  value: z.string(),
  sourceText: z.string().optional(),
});

export const jobFactsSchema = z.object({
  contract: sourcedValueSchema,
  country: sourcedValueSchema,
  education: sourcedValueSchema,
  employmentType: sourcedValueSchema,
  experience: sourcedValueSchema,
  language: sourcedValueSchema,
  location: sourcedValueSchema,
  salary: sourcedValueSchema,
  skills: sourcedValueSchema,
  sponsorship: sourcedValueSchema,
  workArrangement: sourcedValueSchema,
  workAuthorisation: sourcedValueSchema,
});

export const requirementEvidenceSchema = z.object({
  evidence: z.array(z.string()),
  requirement: z.string(),
  sourceText: z.string(),
  state: z.enum(["confirmed", "partial", "missing", "conflicting"]),
});

export const jobAnalysisResultSchema = z.object({
  capability: z.array(requirementEvidenceSchema),
  confidence: z.enum(["Low", "Medium", "High"]),
  coverage: z.number().int().min(0).max(100),
  createdAt: z.string(),
  criticalRisk: z.string(),
  decision: z.enum(["Apply", "Consider", "Skip", "Insufficient information"]),
  id: z.string(),
  nextAction: z.string(),
  positiveEvidence: z.string(),
  reason: z.string(),
  unknowns: z.array(z.string()),
  version: z.number().int().min(1),
});

export const jobRecordWireSchema = z.object({
  id: z.string(),
  atsPlatform: z.string().optional(),
  analysisHistory: z.array(jobAnalysisResultSchema),
  analysisState: z.enum(["Not analysed", "Analysed"]),
  applicationId: z.string().optional(),
  capturedAt: z.string(),
  description: z.string(),
  employer: sourcedValueSchema,
  facts: jobFactsSchema,
  lane: z.string(),
  source: z.enum([
    "Pasted vacancy",
    "Browser extension",
    "Saved job",
    "Development fixture",
  ]),
  sourceUrl: z.string(),
  title: sourcedValueSchema,
  updatedAt: z.string(),
});

export const applicationWorkspaceWireSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  appliedAt: z.string().optional(),
  applicationChannel: z.string().optional(),
  checklist: z.array(z.boolean()).length(8),
  consequentialAnswersReviewed: z.boolean(),
  coverLetter: z.string().optional(),
  coverLetterRequested: z.boolean(),
  createdAt: z.string(),
  documentVersions: z.array(z.string()),
  evidenceConfirmed: z.boolean(),
  followUpDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  // Always empty on the wire today - see the module comment on why
  // screeningAnswers sync is deferred. Included so the inferred wire type
  // still matches ApplicationWorkspace exactly.
  screeningAnswers: z
    .array(
      z.object({
        consequential: z.boolean(),
        confirmed: z.boolean(),
        evidenceIds: z.array(z.string()),
        id: z.string(),
        proposed: z.string(),
        question: z.string(),
        userValue: z.string(),
      }),
    )
    .default([]),
  selectedCvVersion: z.string(),
  status: z.enum([
    "Preparing",
    "Needs review",
    "Ready",
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
    "Withdrawn",
  ]),
  submissionConfirmed: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  updatedAt: z.string(),
});

export const jobWorkflowApiResponseSchema = z.object({
  data: z
    .object({
      jobs: z.array(jobRecordWireSchema),
      applications: z.array(applicationWorkspaceWireSchema),
    })
    .nullable(),
  error: z.string().nullable(),
});

export type JobWorkflowServerState = {
  jobs: JobRecord[];
  applications: ApplicationWorkspace[];
};

export const jobWorkflowUploadRequestSchema = z.object({
  jobs: z.array(
    z.object({ job: jobRecordWireSchema, expectedUpdatedAt: z.string().nullable() }),
  ),
  applications: z.array(
    z.object({
      application: applicationWorkspaceWireSchema,
      expectedUpdatedAt: z.string().nullable(),
    }),
  ),
});

function laterOf(a: string, b: string): "a" | "b" {
  return new Date(a).getTime() >= new Date(b).getTime() ? "a" : "b";
}

export type JobWorkflowReconciliation = {
  jobs: JobRecord[];
  applications: ApplicationWorkspace[];
  jobsToUpload: { job: JobRecord; expectedUpdatedAt: string | null }[];
  applicationsToUpload: {
    application: ApplicationWorkspace;
    expectedUpdatedAt: string | null;
  }[];
};

// Per-record reconciliation by id, last-write-wins by updatedAt - not a
// single-object compare like reconcileMobilityProfiles, since this feature
// is many-rows-per-user (see the note in the module comment above).
export function reconcileJobWorkflow({
  localJobs,
  localApplications,
  server,
}: {
  localJobs: JobRecord[];
  localApplications: ApplicationWorkspace[];
  server: JobWorkflowServerState | null;
}): JobWorkflowReconciliation {
  const serverJobsById = new Map((server?.jobs ?? []).map((job) => [job.id, job]));
  const serverApplicationsById = new Map(
    (server?.applications ?? []).map((application) => [application.id, application]),
  );
  const localJobsById = new Map(localJobs.map((job) => [job.id, job]));
  const localApplicationsById = new Map(
    localApplications.map((application) => [application.id, application]),
  );

  const jobs: JobRecord[] = [];
  const jobsToUpload: JobWorkflowReconciliation["jobsToUpload"] = [];
  const allJobIds = new Set([...localJobsById.keys(), ...serverJobsById.keys()]);
  for (const id of allJobIds) {
    const local = localJobsById.get(id);
    const remote = serverJobsById.get(id);
    if (local && !remote) {
      jobs.push(local);
      jobsToUpload.push({ job: local, expectedUpdatedAt: null });
    } else if (!local && remote) {
      jobs.push(remote);
    } else if (local && remote) {
      if (laterOf(local.updatedAt, remote.updatedAt) === "a") {
        jobs.push(local);
        if (local.updatedAt !== remote.updatedAt)
          jobsToUpload.push({ job: local, expectedUpdatedAt: remote.updatedAt });
      } else {
        jobs.push(remote);
      }
    }
  }

  const applications: ApplicationWorkspace[] = [];
  const applicationsToUpload: JobWorkflowReconciliation["applicationsToUpload"] = [];
  const allApplicationIds = new Set([
    ...localApplicationsById.keys(),
    ...serverApplicationsById.keys(),
  ]);
  for (const id of allApplicationIds) {
    const local = localApplicationsById.get(id);
    const remote = serverApplicationsById.get(id);
    if (local && !remote) {
      applications.push(local);
      applicationsToUpload.push({ application: local, expectedUpdatedAt: null });
    } else if (!local && remote) {
      applications.push(remote);
    } else if (local && remote) {
      if (laterOf(local.updatedAt, remote.updatedAt) === "a") {
        applications.push(local);
        if (local.updatedAt !== remote.updatedAt)
          applicationsToUpload.push({
            application: local,
            expectedUpdatedAt: remote.updatedAt,
          });
      } else {
        applications.push(remote);
      }
    }
  }

  return { jobs, applications, jobsToUpload, applicationsToUpload };
}
