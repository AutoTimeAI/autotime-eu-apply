import { isWorkflowOperationalEvent, workflowTransitionIdPattern, type WorkflowOperationalEvent } from "./workflow-operational-events.ts";
export const workflowEventBodyLimit = 1024;
export type WorkflowOperationalEventBody = { event: WorkflowOperationalEvent; transitionId: string };
export function parseWorkflowOperationalEventBody(raw: string, contentType: string | null, declaredLength: number | null): WorkflowOperationalEventBody | null {
  if (!contentType?.toLowerCase().startsWith("application/json")) return null;
  if (declaredLength !== null && (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > workflowEventBodyLimit)) return null;
  if (new TextEncoder().encode(raw).byteLength > workflowEventBodyLimit) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "event,transitionId") return null;
    const { event, transitionId } = value as Record<string, unknown>;
    if (!isWorkflowOperationalEvent(event) || typeof transitionId !== "string" || !workflowTransitionIdPattern.test(transitionId)) return null;
    return { event, transitionId };
  } catch { return null; }
}

export function isSameOriginWorkflowRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}