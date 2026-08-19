"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { ApplicationWorkspace, JobRecord } from "./job-application-workflow";
import {
  jobWorkflowApiResponseSchema,
  reconcileJobWorkflow,
  type JobWorkflowServerState,
} from "./job-workflow-sync";

export type JobWorkflowSyncState =
  | "loading"
  | "synced"
  | "syncing"
  | "conflict"
  | "offline"
  | "error"
  | "server-disabled";

export type JobWorkflowSyncController = {
  state: JobWorkflowSyncState;
  status: string;
  // Called after every local mutation, in addition to the existing
  // saveJobWorkflow() local write - this is a background mirror, not a
  // replacement for the local-first write path.
  sync: (next: { jobs: JobRecord[]; applications: ApplicationWorkspace[] }) => void;
};

function failureState(error: unknown): {
  state: JobWorkflowSyncState;
  message: string;
} {
  if (typeof navigator !== "undefined" && !navigator.onLine)
    return {
      state: "offline",
      message: "You appear to be offline. Local changes were kept.",
    };
  return {
    state: "error",
    message:
      error instanceof Error
        ? error.message
        : "Account sync could not be completed.",
  };
}

export function useJobWorkflowSync({
  enabled,
  localJobs,
  localApplications,
  onReconciled,
  userId,
}: {
  // Gate the initial reconciliation until the caller's own local-storage
  // load effect has actually populated localJobs/localApplications - both
  // are plain effects, and without this gate this hook's mount effect can
  // run in the same commit as (and read stale/empty state from before) the
  // caller's local-load effect, reconciling against nothing and clobbering
  // freshly-loaded local data via onReconciled.
  enabled: boolean;
  localJobs: JobRecord[];
  localApplications: ApplicationWorkspace[];
  onReconciled: (next: {
    jobs: JobRecord[];
    applications: ApplicationWorkspace[];
  }) => void;
  userId: string;
}): JobWorkflowSyncController {
  const [state, setState] = useState<JobWorkflowSyncState>("loading");
  const [status, setStatus] = useState("Loading your account copy…");
  const knownUpdatedAt = useRef({
    jobs: new Map<string, string>(),
    applications: new Map<string, string>(),
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  const upload = useCallback(
    async (jobs: JobRecord[], applications: ApplicationWorkspace[]) => {
      setState("syncing");
      setStatus("Saving your Jobs/Applications data to your account…");
      try {
        const response = await fetch("/api/sync/job-workflow", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobs: jobs.map((job) => ({
              job,
              expectedUpdatedAt: knownUpdatedAt.current.jobs.get(job.id) ?? null,
            })),
            applications: applications.map((application) => ({
              application,
              expectedUpdatedAt:
                knownUpdatedAt.current.applications.get(application.id) ?? null,
            })),
          }),
        });
        const body: unknown = await response.json();
        if (!activeRef.current) return;
        if (!response.ok) {
          throw new Error("Account sync could not be completed.");
        }
        const parsed = z
          .object({
            data: z
              .object({
                jobs: z.array(z.unknown()),
                applications: z.array(z.unknown()),
                conflicts: z.object({
                  jobs: z.array(z.string()),
                  applications: z.array(z.string()),
                }),
              })
              .nullable(),
            error: z.string().nullable(),
          })
          .parse(body);
        if (parsed.error || !parsed.data) {
          throw new Error(parsed.error ?? "Account sync could not be completed.");
        }
        for (const job of parsed.data.jobs as JobRecord[]) {
          knownUpdatedAt.current.jobs.set(job.id, job.updatedAt);
        }
        for (const application of parsed.data.applications as ApplicationWorkspace[]) {
          knownUpdatedAt.current.applications.set(
            application.id,
            application.updatedAt,
          );
        }
        const hasConflicts =
          parsed.data.conflicts.jobs.length > 0 ||
          parsed.data.conflicts.applications.length > 0;
        if (hasConflicts) {
          setState("conflict");
          setStatus(
            "Some items changed elsewhere and were not overwritten. Reopen this page to load the latest account copy.",
          );
          return;
        }
        setState("synced");
        setStatus("Saved to your account.");
      } catch (error: unknown) {
        if (!activeRef.current) return;
        const failure = failureState(error);
        setState(failure.state);
        setStatus(failure.message);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    activeRef.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/sync/job-workflow");
        if (!activeRef.current) return;
        if (response.status === 404) {
          setState("server-disabled");
          setStatus("Account sync is not available in this environment.");
          return;
        }
        if (response.status === 401) {
          setState("error");
          setStatus("Sign in again before using account sync.");
          return;
        }
        const body: unknown = await response.json();
        if (!response.ok) throw new Error("Account copy could not be loaded.");
        const parsed = jobWorkflowApiResponseSchema.parse(body);
        const server: JobWorkflowServerState | null = parsed.data;
        for (const job of server?.jobs ?? []) {
          knownUpdatedAt.current.jobs.set(job.id, job.updatedAt);
        }
        for (const application of server?.applications ?? []) {
          knownUpdatedAt.current.applications.set(
            application.id,
            application.updatedAt,
          );
        }
        const reconciliation = reconcileJobWorkflow({
          localJobs,
          localApplications,
          server,
        });
        onReconciled({ jobs: reconciliation.jobs, applications: reconciliation.applications });
        setState("synced");
        setStatus("Loaded your account copy.");
        if (
          reconciliation.jobsToUpload.length ||
          reconciliation.applicationsToUpload.length
        ) {
          await upload(reconciliation.jobs, reconciliation.applications);
        }
      } catch (error: unknown) {
        if (!activeRef.current) return;
        const failure = failureState(error);
        setState(failure.state);
        setStatus(failure.message);
      }
    })();
    return () => {
      activeRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Intentionally only re-runs on userId/enabled change - this hook
    // reconciles once local data is ready, then relies on sync() being
    // called explicitly after local mutations rather than re-reconciling on
    // every local state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  const sync = useCallback(
    (next: { jobs: JobRecord[]; applications: ApplicationWorkspace[] }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void upload(next.jobs, next.applications);
      }, 900);
    },
    [upload],
  );

  return { state, status, sync };
}
