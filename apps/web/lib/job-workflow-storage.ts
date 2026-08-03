import { extractJob, type JobWorkflowState } from "./job-application-workflow";
import {
  emitWorkflowOperationalEvent,
  type WorkflowOperationalEvent,
} from "./workflow-operational-events";

const baseKey = "autotime-phase-3b-workflow-v1";
export const emptyJobWorkflowState: JobWorkflowState = {
  applications: [],
  jobs: [],
  schemaVersion: 1,
};
const keyFor = (userId: string) => `${baseKey}:${userId}`;

function importLegacyJobs(userId: string): JobWorkflowState {
  try {
    const legacy = JSON.parse(
      window.localStorage.getItem(
        `autotime-v2-companion-dashboard:${userId}`,
      ) ?? "null",
    ) as {
      applications?: Array<{
        company?: string;
        createdAt?: string;
        notes?: string;
        roleTitle?: string;
        source?: string;
        title?: string;
        url?: string;
      }>;
    } | null;
    const jobs = (legacy?.applications ?? []).flatMap((item) => {
      if (!item.notes || item.notes.trim().length < 80) return [];
      try {
        const job = extractJob({
          description: item.notes,
          employer: item.company,
          now: item.createdAt,
          sourceUrl: item.url,
          title: item.roleTitle || item.title,
        });
        return [
          {
            ...job,
            source: /extension/i.test([item.source, item.notes].join(" "))
              ? ("Browser extension" as const)
              : ("Saved job" as const),
          },
        ];
      } catch {
        return [];
      }
    });
    return { ...emptyJobWorkflowState, jobs };
  } catch {
    return emptyJobWorkflowState;
  }
}

export function loadJobWorkflow(userId: string): JobWorkflowState {
  if (typeof window === "undefined" || !userId) return emptyJobWorkflowState;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(keyFor(userId)) ?? "null",
    ) as JobWorkflowState | null;
    if (!value) return importLegacyJobs(userId);
    if (
      value.schemaVersion !== 1 ||
      !Array.isArray(value.jobs) ||
      !Array.isArray(value.applications)
    )
      return emptyJobWorkflowState;
    return value;
  } catch {
    return emptyJobWorkflowState;
  }
}

export function saveJobWorkflow(userId: string, state: JobWorkflowState) {
  if (!userId) throw new Error("Authenticated user ID is required.");
  const previous = loadJobWorkflow(userId);
  window.localStorage.setItem(keyFor(userId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("autotime-job-workflow-changed"));

  const events = new Map<WorkflowOperationalEvent, string>();
  const addedJob = state.jobs.find(
    (job) => !previous.jobs.some((item) => item.id === job.id),
  );
  if (addedJob) events.set("job_saved", addedJob.id);
  const analysedJob = state.jobs.find((job) => {
    const prior = previous.jobs.find((item) => item.id === job.id);
    return (
      (job.analysisHistory?.length ?? 0) > (prior?.analysisHistory?.length ?? 0)
    );
  });
  if (analysedJob) events.set("job_analysed", analysedJob.id);
  const addedApplication = state.applications.find(
    (application) =>
      !previous.applications.some((item) => item.id === application.id),
  );
  if (addedApplication) events.set("application_prepared", addedApplication.id);
  const submittedApplication = state.applications.find((application) => {
    const prior = previous.applications.find(
      (item) => item.id === application.id,
    );
    return application.status === "Applied" && prior?.status !== "Applied";
  });
  if (submittedApplication)
    events.set("application_submitted", submittedApplication.id);

  events.forEach((transitionId, event) =>
    emitWorkflowOperationalEvent(event, transitionId),
  );
}
