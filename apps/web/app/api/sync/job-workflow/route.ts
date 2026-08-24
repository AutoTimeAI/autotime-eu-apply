import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error";
import {
  jobWorkflowDeleteRequestSchema,
  jobWorkflowUploadRequestSchema,
} from "../../../../lib/job-workflow-sync";
import {
  JobWorkflowConflictError,
  jobWorkflowServerSyncEnabled,
  readJobWorkflow,
  softDeleteJobWorkflowItems,
  upsertApplication,
  upsertJob,
} from "../../../../lib/job-workflow-repository";
import { createAdminClient } from "../../../../lib/supabase/admin";

function json(data: unknown, error: string | null, status = 200) {
  return NextResponse.json({ data, error }, { status });
}

function unavailable() {
  return json(null, "Job workflow account sync is not enabled.", 404);
}

async function authenticatedUserId(request: Request) {
  try {
    const { user } = await getRequestUser(request);
    return user?.id ?? null;
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return "configuration-unavailable" as const;
    throw error;
  }
}

export async function GET(request: Request) {
  if (!jobWorkflowServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (userId === "configuration-unavailable")
    return json(null, configurationUnavailableMessage, 503);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    return json(await readJobWorkflow(createAdminClient(), userId), null);
  } catch {
    return json(null, "Job workflow could not be read.", 500);
  }
}

export async function PUT(request: Request) {
  if (!jobWorkflowServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (userId === "configuration-unavailable")
    return json(null, configurationUnavailableMessage, 503);
  if (!userId) return json(null, "Unauthorised", 401);

  let body: z.infer<typeof jobWorkflowUploadRequestSchema>;
  try {
    body = jobWorkflowUploadRequestSchema.parse(await request.json());
  } catch {
    return json(null, "Invalid request body", 400);
  }

  const client = createAdminClient();
  const savedJobs = [];
  const jobConflicts: string[] = [];
  // Jobs must be upserted before applications: job_workflow_applications
  // and job_workflow_analysis_snapshots both FK onto job_workflow_jobs.
  for (const { job, expectedUpdatedAt } of body.jobs) {
    try {
      savedJobs.push(await upsertJob(client, userId, job, expectedUpdatedAt));
    } catch (error: unknown) {
      if (error instanceof JobWorkflowConflictError) {
        jobConflicts.push(error.id);
        continue;
      }
      return json(null, "Job workflow could not be saved.", 500);
    }
  }

  const savedApplications = [];
  const applicationConflicts: string[] = [];
  for (const { application, expectedUpdatedAt } of body.applications) {
    try {
      savedApplications.push(
        await upsertApplication(client, userId, application, expectedUpdatedAt),
      );
    } catch (error: unknown) {
      if (error instanceof JobWorkflowConflictError) {
        applicationConflicts.push(error.id);
        continue;
      }
      return json(null, "Job workflow could not be saved.", 500);
    }
  }

  return json(
    {
      jobs: savedJobs,
      applications: savedApplications,
      conflicts: { jobs: jobConflicts, applications: applicationConflicts },
    },
    null,
  );
}

// Soft-deletes (see softDeleteJobWorkflowItems) rather than a real SQL
// delete, so a tombstone survives for other devices/tabs to reconcile
// against instead of silently re-adopting the item from the server again.
export async function DELETE(request: Request) {
  if (!jobWorkflowServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (userId === "configuration-unavailable")
    return json(null, configurationUnavailableMessage, 503);
  if (!userId) return json(null, "Unauthorised", 401);

  let body: z.infer<typeof jobWorkflowDeleteRequestSchema>;
  try {
    body = jobWorkflowDeleteRequestSchema.parse(await request.json());
  } catch {
    return json(null, "Invalid request body", 400);
  }

  if (!body.jobIds.length && !body.applicationIds.length) {
    return json({ deletedJobIds: [], deletedApplicationIds: [] }, null);
  }

  try {
    const result = await softDeleteJobWorkflowItems(
      createAdminClient(),
      userId,
      body.jobIds,
      body.applicationIds,
    );
    return json(result, null);
  } catch {
    return json(null, "Job workflow items could not be deleted.", 500);
  }
}
