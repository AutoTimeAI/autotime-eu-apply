import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { evaluateMobilityRuleCase, mobilityEvaluationFixtureSchema } from "shared"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"
const schema = z.object({ ruleBundleVersionId: z.string().uuid(), fixtureSetId: z.string().uuid(), runId: z.string().trim().min(3).max(160), evaluatedAt: z.string().datetime({ offset: true }), confirm: z.literal(true) })
type UntypedClient = SupabaseClient<any>
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_rules:evaluate")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json()); const db = createAdminClient() as unknown as UntypedClient
    const bundle = await db.from("mobility_rule_bundle_versions").select("rules,evaluation_case_ids").eq("id", body.ruleBundleVersionId).maybeSingle()
    if (bundle.error || !bundle.data) throw new Error("mobility_rule_bundle_not_found")
    const fixtureSet = await db.from("mobility_evaluation_fixture_sets").select("fixtures,fixtures_sha256").eq("id", body.fixtureSetId).maybeSingle()
    if (fixtureSet.error || !fixtureSet.data || !Array.isArray(fixtureSet.data.fixtures)) throw new Error("mobility_fixture_set_not_found")
    const executableRules = bundle.data.rules
    const fixtures = z.array(mobilityEvaluationFixtureSchema).parse(fixtureSet.data.fixtures)
    const results = fixtures.map((fixture) => evaluateMobilityRuleCase(executableRules, fixture))
    const recorded = await db.rpc("admin_record_mobility_rule_evaluation", { p_actor_user_id: principal.user.id, p_rule_bundle_version_id: body.ruleBundleVersionId, p_fixture_set_id: body.fixtureSetId, p_run_id: body.runId, p_results: results, p_evaluated_at: body.evaluatedAt })
    if (recorded.error || typeof recorded.data !== "number") throw new Error("mobility_rule_evaluation_failed")
    return NextResponse.json({ data: { runId: body.runId, resultCount: recorded.data, allPassed: results.every((result) => result.passed), results }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid mobility evaluation run" }, { status: 400 })
    return safeAdminError(error, "mobility_rule_evaluation")
  }
}
