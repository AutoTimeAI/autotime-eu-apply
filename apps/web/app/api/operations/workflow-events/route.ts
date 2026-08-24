/**
 * POST /api/operations/workflow-events
 *
 * Records a single job-workflow operational event (e.g. a state
 * transition telemetry ping from the client-side job workflow) via the
 * `record_workflow_operational_event` Postgres RPC.
 *
 * Auth: requires a valid Supabase session (`supabase.auth.getUser()`
 * directly, not `getRequestUser`); unauthenticated callers receive 401.
 *
 * Behaviour: defence-in-depth request validation before touching auth or
 * the database — rejects cross-origin requests (`isSameOriginWorkflowRequest`),
 * non-JSON content types (415), and bodies whose declared `Content-Length`
 * exceeds `workflowEventBodyLimit` (413). The body itself is parsed via
 * `parseWorkflowOperationalEventBody`. The RPC can report a "rate_limited"
 * outcome (surfaced as 429) or a "duplicate" outcome (idempotent replay,
 * surfaced as 200 instead of 201). All error responses are intentionally
 * generic ("The operation could not be completed.") with a
 * `diagnosticId` for correlation, via `createSafeDiagnostic`.
 */
import "server-only";
import { NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/admin-authorization";
import { createSafeDiagnostic } from "../../../../lib/admin-safe-response";
import { createServerClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import {
  isSameOriginWorkflowRequest,
  parseWorkflowOperationalEventBody,
  workflowEventBodyLimit,
} from "../../../../lib/workflow-operational-event-contract";

export const dynamic = "force-dynamic";
const errorResponse = (status: number, category: string) =>
  NextResponse.json(
    {
      error: "The operation could not be completed.",
      diagnosticId: createSafeDiagnostic(category),
    },
    { status },
  );

/**
 * Validates and records one workflow operational event for the
 * authenticated caller.
 *
 * Responses:
 * - 200/201: `{ outcome }` — 200 for a "duplicate" (idempotent) outcome,
 *   201 otherwise.
 * - 400: body failed `parseWorkflowOperationalEventBody` validation.
 * - 401: no authenticated Supabase session.
 * - 403: cross-origin request.
 * - 413: declared body size exceeds `workflowEventBodyLimit`.
 * - 415: request content-type is not JSON.
 * - 429: RPC reports the event is rate-limited.
 * - 503: RPC call failed or returned no data.
 */
export async function POST(request: Request) {
  if (!isSameOriginWorkflowRequest(request))
    return errorResponse(403, "workflow_event_origin");
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json"))
    return errorResponse(415, "workflow_event_content_type");
  const lengthHeader = request.headers.get("content-length");
  const declaredLength = lengthHeader === null ? null : Number(lengthHeader);
  if (declaredLength !== null && (!Number.isFinite(declaredLength) || declaredLength > workflowEventBodyLimit))
    return errorResponse(413, "workflow_event_body_size");

  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return errorResponse(401, "workflow_event_auth");

  const body = parseWorkflowOperationalEventBody(await request.text(), contentType, declaredLength);
  if (!body)
    return errorResponse(400, "workflow_event_validation");
  const { event, transitionId } = body;

  const { data, error: rpcError } = await createAdminClient().rpc(
    "record_workflow_operational_event",
    { p_event: event, p_transition_id: transitionId, p_user_id: user.id },
  );
  if (rpcError || !data?.[0])
    return errorResponse(503, "workflow_event_database");
  if (data[0].outcome === "rate_limited")
    return errorResponse(429, "workflow_event_rate_limit");
  return NextResponse.json(
    { outcome: data[0].outcome },
    { status: data[0].outcome === "duplicate" ? 200 : 201 },
  );
}
