import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const text = z.string().trim().min(3).max(20_000)
const schema = z.object({
  predecessorClaimVersionId: z.string().uuid(), statement: text,
  claimType: z.enum(["fact", "derived_fact", "interpretation"]),
  confidence: z.enum(["high", "medium", "low"]),
  sourceSpanIds: z.array(z.string().uuid()).min(1).max(50),
  reviewerName: z.string().trim().min(2).max(200), reviewerRole: z.string().trim().min(2).max(200),
  qualificationBasis: z.string().trim().min(3).max(2000), scopeReviewed: z.string().trim().min(3).max(2000),
  signatureReference: z.string().trim().min(8).max(500), reviewedAt: z.string().datetime({ offset: true }),
  confirm: z.literal(true),
})
type UntypedClient = SupabaseClient<any>

export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_claims:review")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_approve_mobility_claim_successor", {
      p_actor_user_id: principal.user.id, p_predecessor_claim_version_id: body.predecessorClaimVersionId,
      p_statement: body.statement, p_claim_type: body.claimType, p_confidence: body.confidence,
      p_source_span_ids: [...new Set(body.sourceSpanIds)], p_reviewer_name: body.reviewerName,
      p_reviewer_role: body.reviewerRole, p_qualification_basis: body.qualificationBasis,
      p_scope_reviewed: body.scopeReviewed, p_signature_reference: body.signatureReference,
      p_reviewed_at: body.reviewedAt,
    })
    if (result.error || typeof result.data !== "string") throw new Error("claim_successor_approval_failed")
    return NextResponse.json({ data: { approvedClaimVersionId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid claim review" }, { status: 400 })
    return safeAdminError(error, "mobility_claim_review")
  }
}
