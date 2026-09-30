import { duplicateJob, type JobRecord } from "./job-application-workflow";
import { jobWorkflowApiResponseSchema } from "./job-workflow-sync";

type FetchAccountWorkflow = (input: string, init?: RequestInit) => Promise<Response>;

/** Checks the account copy before an aggregated listing is tracked. */
export async function accountAlreadyTracksJob(
  candidate: JobRecord,
  fetchAccountWorkflow: FetchAccountWorkflow = fetch,
): Promise<boolean> {
  try {
    const response = await fetchAccountWorkflow("/api/sync/job-workflow", {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const parsed = jobWorkflowApiResponseSchema.parse(await response.json());
    return Boolean(duplicateJob(parsed.data?.jobs ?? [], candidate));
  } catch {
    // Preserve the existing local-first path when account sync is offline.
    return false;
  }
}
