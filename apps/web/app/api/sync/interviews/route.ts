import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error";
import { interviewWorkflowUploadRequestSchema } from "../../../../lib/interview-workflow-sync";
import {
  InterviewWorkflowConflictError,
  interviewWorkflowServerSyncEnabled,
  readInterviewWorkflow,
  upsertInterview,
} from "../../../../lib/interview-workflow-repository";
import { createAdminClient } from "../../../../lib/supabase/admin";

function json(data: unknown, error: string | null, status = 200) {
  return NextResponse.json({ data, error }, { status });
}

function unavailable() {
  return json(null, "Interview account sync is not enabled.", 404);
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
  if (!interviewWorkflowServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (userId === "configuration-unavailable")
    return json(null, configurationUnavailableMessage, 503);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    return json(await readInterviewWorkflow(createAdminClient(), userId), null);
  } catch {
    return json(null, "Interview workflow could not be read.", 500);
  }
}

export async function PUT(request: Request) {
  if (!interviewWorkflowServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (userId === "configuration-unavailable")
    return json(null, configurationUnavailableMessage, 503);
  if (!userId) return json(null, "Unauthorised", 401);

  let body: z.infer<typeof interviewWorkflowUploadRequestSchema>;
  try {
    body = interviewWorkflowUploadRequestSchema.parse(await request.json());
  } catch {
    return json(null, "Invalid request body", 400);
  }

  const client = createAdminClient();
  const savedInterviews = [];
  const interviewConflicts: string[] = [];
  for (const { interview, expectedUpdatedAt } of body.interviews) {
    try {
      savedInterviews.push(await upsertInterview(client, userId, interview, expectedUpdatedAt));
    } catch (error: unknown) {
      if (error instanceof InterviewWorkflowConflictError) {
        interviewConflicts.push(error.id);
        continue;
      }
      return json(null, "Interview workflow could not be saved.", 500);
    }
  }

  return json(
    { interviews: savedInterviews, conflicts: { interviews: interviewConflicts } },
    null,
  );
}
