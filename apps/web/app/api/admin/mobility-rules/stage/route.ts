import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const schema = z.object({
  predecessorVersionId: z.string().uuid(), approvedClaimVersionIds: z.array(z.string().uuid()).min(1).max(100),
  rules: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0),
  evaluationCaseIds: z.array(z.string().trim().min(3).max(160)).min(1).max(200),
  effectiveFrom: z.string().datetime({ offset: true }), reason: z.string().trim().min(10).max(500), confirm: z.literal(true),
})
type UntypedClient = SupabaseClient<any>
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_rules:stage")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_stage_mobility_rule_bundle", {
      p_actor_user_id: principal.user.id, p_predecessor_version_id: body.predecessorVersionId,
      p_approved_claim_version_ids: [...new Set(body.approvedClaimVersionIds)], p_rules: body.rules,
      p_evaluation_case_ids: [...new Set(body.evaluationCaseIds)], p_effective_from: body.effectiveFrom, p_reason: body.reason,
    })
    if (result.error || typeof result.data !== "string") throw new Error("mobility_rule_staging_failed")
    return NextResponse.json({ data: { stagedVersionId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid mobility rule staging request" }, { status: 400 })
    return safeAdminError(error, "mobility_rule_staging")
  }
}
