import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const evidenceReference = z.object({
  type: z.enum(["source_version", "candidate_evidence", "vacancy_snapshot", "employer_verification", "decision"]),
  id: z.string().uuid(),
})
const schema = z.object({
  correctionId: z.string().uuid(),
  decision: z.enum(["triaged", "accepted", "rejected"]),
  reasonCodes: z.array(z.string().trim().min(3).max(80).regex(/^[A-Z0-9_]+$/)).min(1).max(10),
  resolutionNotes: z.string().trim().min(10).max(4000),
  evidenceReferences: z.array(evidenceReference).max(50),
  successorDecisionId: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime({ offset: true }),
  confirm: z.literal(true),
}).superRefine((value, context) => {
  if (value.decision === "accepted" && (!value.successorDecisionId || value.evidenceReferences.length === 0)) {
    context.addIssue({ code: "custom", message: "Accepted corrections require evidence and a successor decision" })
  }
  if (value.decision !== "accepted" && value.successorDecisionId) {
    context.addIssue({ code: "custom", message: "Only accepted corrections may link a successor decision" })
  }
})
type UntypedClient = SupabaseClient<any>

export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_corrections:review")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_review_mobility_decision_correction", {
      p_actor_user_id: principal.user.id,
      p_correction_id: body.correctionId,
      p_decision: body.decision,
      p_reason_codes: [...new Set(body.reasonCodes)],
      p_resolution_notes: body.resolutionNotes,
      p_evidence_references: body.evidenceReferences,
      p_successor_decision_id: body.successorDecisionId,
      p_reviewed_at: body.reviewedAt,
    })
    if (result.error || typeof result.data !== "string") throw new Error("mobility_correction_review_failed")
    return NextResponse.json({ data: { reviewId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid correction review" }, { status: 400 })
    return safeAdminError(error, "mobility_correction_review")
  }
}
