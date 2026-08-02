export const workflowOperationalEvents = [
  "job_saved",
  "job_analysed",
  "application_prepared",
  "application_submitted",
] as const;

export type WorkflowOperationalEvent =
  (typeof workflowOperationalEvents)[number];
export const workflowTransitionIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isWorkflowOperationalEvent(
  value: unknown,
): value is WorkflowOperationalEvent {
  return (
    typeof value === "string" &&
    workflowOperationalEvents.includes(value as WorkflowOperationalEvent)
  );
}

export function emitWorkflowOperationalEvent(
  event: WorkflowOperationalEvent,
  transitionId: string,
) {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY === "true") return;
  if (!workflowTransitionIdPattern.test(transitionId)) return;

  void fetch("/api/operations/workflow-events", {
    body: JSON.stringify({ event, transitionId }),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => {
    // Telemetry must never block or alter the customer workflow.
  });
}
