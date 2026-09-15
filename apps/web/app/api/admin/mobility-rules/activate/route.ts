import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"

const schema = z.object({
  reviewedVersionId: z.string().uuid(), countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
  reason: z.string().trim().min(10).max(500), activatedAt: z.string().datetime({ offset: true }),
  confirm: z.literal(true),
})
type UntypedClient = SupabaseClient<any>
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_rules:activate")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_activate_mobility_rule_bundle", {
      p_actor_user_id: principal.user.id, p_reviewed_version_id: body.reviewedVersionId,
      p_country_code: body.countryCode.toUpperCase(), p_reason: body.reason, p_activated_at: body.activatedAt,
    })
    if (result.error || typeof result.data !== "string") throw new Error("mobility_rule_activation_failed")
    return NextResponse.json({ data: { activatedVersionId: result.data }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid mobility rule activation" }, { status: 400 })
    return safeAdminError(error, "mobility_rule_activation")
  }
}
