import { NextResponse } from "next/server"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { AdminAuthorizationError, isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const schema = z.object({
  sourceChangeEventId: z.string().uuid(),
  decision: z.enum(["accepted_for_claim_review", "rejected"]),
  reasonCodes: z.array(z.string().trim().min(3).max(80).regex(/^[A-Z0-9_]+$/)).min(1).max(10),
  confirm: z.literal(true),
})
type UntypedClient = SupabaseClient<any>

export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_sources:review")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_review_mobility_source_capture", {
      p_actor_user_id: principal.user.id,
      p_source_change_event_id: body.sourceChangeEventId,
      p_decision: body.decision,
      p_reason_codes: body.reasonCodes,
    })
    if (result.error || typeof result.data !== "string") throw new Error("source_capture_review_failed")
    return NextResponse.json({ data: { reviewId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid source capture review" }, { status: 400 })
    if (error instanceof AdminAuthorizationError) return safeAdminError(error, "mobility_source_capture_review")
    return safeAdminError(error, "mobility_source_capture_review")
  }
}
