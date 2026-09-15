import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const text = z.string().trim().min(3).max(2000)
const timestamp = z.string().datetime({ offset: true })
const schema = z.object({
  ruleBundleVersionId: z.string().uuid(), reviewerName: z.string().trim().min(2).max(200),
  reviewerRole: z.string().trim().min(2).max(200), qualificationBasis: text,
  scopeReviewed: text, permittedOutputLanguage: text, prohibitedOutputLanguage: text,
  conditionsAndExclusions: text, testRunId: z.string().trim().min(3).max(160),
  decision: z.enum(["approved", "approved_with_conditions", "rejected"]),
  effectiveFrom: timestamp, reviewBy: timestamp, signedAt: timestamp,
  signatureReference: z.string().trim().min(8).max(500), confirm: z.literal(true),
}).superRefine((value, context) => {
  if (Date.parse(value.reviewBy) <= Date.parse(value.effectiveFrom)) context.addIssue({ code: "custom", path: ["reviewBy"], message: "Review expiry must follow effective date" })
})
type UntypedClient = SupabaseClient<any>

export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_experts:record")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_record_mobility_expert_signoff", {
      p_actor_user_id: principal.user.id, p_rule_bundle_version_id: body.ruleBundleVersionId,
      p_reviewer_name: body.reviewerName, p_reviewer_role: body.reviewerRole,
      p_qualification_basis: body.qualificationBasis, p_scope_reviewed: body.scopeReviewed,
      p_permitted_output_language: body.permittedOutputLanguage,
      p_prohibited_output_language: body.prohibitedOutputLanguage,
      p_conditions_and_exclusions: body.conditionsAndExclusions, p_test_run_id: body.testRunId,
      p_decision: body.decision, p_effective_from: body.effectiveFrom, p_review_by: body.reviewBy,
      p_signed_at: body.signedAt, p_signature_reference: body.signatureReference,
    })
    if (result.error || typeof result.data !== "string") throw new Error("expert_signoff_record_failed")
    return NextResponse.json({ data: { signoffId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid expert sign-off record" }, { status: 400 })
    return safeAdminError(error, "mobility_expert_signoff_record")
  }
}
