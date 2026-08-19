"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { InterviewRecord } from "./interview-workflow";
import {
  interviewWorkflowApiResponseSchema,
  reconcileInterviewWorkflow,
  type InterviewWorkflowServerState,
} from "./interview-workflow-sync";

export type InterviewWorkflowSyncState =
  | "loading"
  | "synced"
  | "syncing"
  | "conflict"
  | "offline"
  | "error"
  | "server-disabled";

export type InterviewWorkflowSyncController = {
  state: InterviewWorkflowSyncState;
  status: string;
  // Called after every local mutation, in addition to the existing
  // saveInterviewWorkflow() local write - this is a background mirror, not
  // a replacement for the local-first write path.
  sync: (next: { interviews: InterviewRecord[] }) => void;
};

function failureState(error: unknown): {
  state: InterviewWorkflowSyncState;
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

export function useInterviewWorkflowSync({
  enabled,
  localInterviews,
  onReconciled,
  userId,
}: {
  // Gate the initial reconciliation until the caller's own local-storage
  // load effect has actually populated localInterviews - both are plain
  // effects, and without this gate this hook's mount effect can run in the
  // same commit as (and read stale/empty state from before) the caller's
  // local-load effect, reconciling against nothing and clobbering
  // freshly-loaded local data via onReconciled.
  enabled: boolean;
  localInterviews: InterviewRecord[];
  onReconciled: (next: { interviews: InterviewRecord[] }) => void;
  userId: string;
}): InterviewWorkflowSyncController {
  const [state, setState] = useState<InterviewWorkflowSyncState>("loading");
  const [status, setStatus] = useState("Loading your account copy…");
  const knownUpdatedAt = useRef(new Map<string, string>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  const upload = useCallback(async (interviews: InterviewRecord[]) => {
    setState("syncing");
    setStatus("Saving your Interviews data to your account…");
    try {
      const response = await fetch("/api/sync/interviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviews: interviews.map((interview) => ({
            interview,
            expectedUpdatedAt: knownUpdatedAt.current.get(interview.id) ?? null,
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
              interviews: z.array(z.unknown()),
              conflicts: z.object({ interviews: z.array(z.string()) }),
            })
            .nullable(),
          error: z.string().nullable(),
        })
        .parse(body);
      if (parsed.error || !parsed.data) {
        throw new Error(parsed.error ?? "Account sync could not be completed.");
      }
      for (const interview of parsed.data.interviews as InterviewRecord[]) {
        knownUpdatedAt.current.set(interview.id, interview.updatedAt);
      }
      if (parsed.data.conflicts.interviews.length > 0) {
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
  }, []);

  useEffect(() => {
    if (!enabled) return;
    activeRef.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/sync/interviews");
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
        const parsed = interviewWorkflowApiResponseSchema.parse(body);
        const server: InterviewWorkflowServerState | null = parsed.data;
        for (const interview of server?.interviews ?? []) {
          knownUpdatedAt.current.set(interview.id, interview.updatedAt);
        }
        const reconciliation = reconcileInterviewWorkflow({ localInterviews, server });
        onReconciled({ interviews: reconciliation.interviews });
        setState("synced");
        setStatus("Loaded your account copy.");
        if (reconciliation.interviewsToUpload.length) {
          await upload(reconciliation.interviews);
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
    (next: { interviews: InterviewRecord[] }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void upload(next.interviews);
      }, 900);
    },
    [upload],
  );

  return { state, status, sync };
}
