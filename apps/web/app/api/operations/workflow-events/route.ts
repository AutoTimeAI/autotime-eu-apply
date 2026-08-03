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
