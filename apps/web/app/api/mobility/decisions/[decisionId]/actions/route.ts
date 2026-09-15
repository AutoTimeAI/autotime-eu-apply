import type { SupabaseClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "node:crypto"
import { evaluateMobilityRuleCase } from "shared"
import { getRequestUser } from "../../../../../../lib/api-auth"
import { createAdminClient } from "../../../../../../lib/supabase/admin"

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" }
// These append-only moat tables intentionally lead the generated Database
// type until the next schema-codegen pass.
type UntypedClient = SupabaseClient<any>

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("submit_correction"),
    targetType: z.enum(["candidate_evidence", "vacancy", "employer", "claim", "source", "rule", "output"]),
    targetId: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal("request_replay"),
    mode: z.enum(["original_versions", "successor_comparison"]),
  }),
])

const recordedEvaluationSchema = z.object({
  expectedState: z.string().min(1),
  actualState: z.string().nullable(),
  matchedRuleId: z.string().nullable(),
  passed: z.boolean(),
  evaluatedFacts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
})

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`
  return JSON.stringify(value)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> },
) {
  try {
    const { user } = await getRequestUser(request)
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401, headers: privateHeaders })
    const { decisionId } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(decisionId)) {
      return NextResponse.json({ data: null, error: "Invalid decision identifier" }, { status: 400, headers: privateHeaders })
    }
    const body = actionSchema.parse(await request.json())
    const db = createAdminClient() as unknown as UntypedClient
    const ownedDecision = await db.from("mobility_decision_records")
      .select("id,rule_bundle_version_id,canonical_output,canonical_output_sha256")
      .eq("id", decisionId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (ownedDecision.error) throw ownedDecision.error
    if (!ownedDecision.data) return NextResponse.json({ data: null, error: "Decision not found" }, { status: 404, headers: privateHeaders })

    if (body.action === "submit_correction") {
      const result = await db.from("mobility_decision_corrections").insert({
        user_id: user.id,
        original_decision_id: decisionId,
        successor_decision_id: null,
        target_type: body.targetType,
        target_id: body.targetId,
        reason: body.reason,
        state: "submitted",
      }).select("id,target_type,target_id,reason,state,submitted_at,resolved_at").single()
      if (result.error) throw result.error
      return NextResponse.json({ data: { correction: result.data }, error: null }, { status: 201, headers: privateHeaders })
    }

    if (body.mode === "original_versions") {
      const canonicalOutput = ownedDecision.data.canonical_output as Record<string, unknown> | null
      const canonicalHash = createHash("sha256").update(stable(canonicalOutput)).digest("hex")
      if (canonicalHash !== ownedDecision.data.canonical_output_sha256) return NextResponse.json(
        { data: null, error: "The recorded decision failed its integrity check.", code: "MOBILITY_REPLAY_INTEGRITY_FAILURE" },
        { status: 409, headers: privateHeaders },
      )
      const recorded = recordedEvaluationSchema.safeParse(canonicalOutput?.executableEvaluation)
      if (!recorded.success) return NextResponse.json(
        { data: null, error: "This historical decision predates executable replay facts.", code: "MOBILITY_REPLAY_INPUTS_UNAVAILABLE" },
        { status: 409, headers: privateHeaders },
      )
      const bundle = await db.from("mobility_rule_bundle_versions")
        .select("id,rules").eq("id", ownedDecision.data.rule_bundle_version_id).maybeSingle()
      if (bundle.error) throw bundle.error
      if (!bundle.data) return NextResponse.json(
        { data: null, error: "The historical rule bundle is unavailable.", code: "MOBILITY_REPLAY_RULES_UNAVAILABLE" },
        { status: 409, headers: privateHeaders },
      )
      let replayed
      try {
        replayed = evaluateMobilityRuleCase(bundle.data.rules, {
          caseId: `replay-${decisionId}`,
          facts: recorded.data.evaluatedFacts,
          expectedState: recorded.data.actualState ?? recorded.data.expectedState,
        })
      } catch {
        return NextResponse.json(
          { data: null, error: "The historical rule bundle cannot be executed.", code: "MOBILITY_REPLAY_RULES_INVALID" },
          { status: 409, headers: privateHeaders },
        )
      }
      const equivalent = replayed.actualState === recorded.data.actualState
      const diff = {
        original: { actualState: recorded.data.actualState, matchedRuleId: recorded.data.matchedRuleId },
        replayed: { actualState: replayed.actualState, matchedRuleId: replayed.matchedRuleId },
      }
      const idempotencyKey = createHash("sha256").update([
        decisionId, body.mode, String(ownedDecision.data.rule_bundle_version_id), String(ownedDecision.data.canonical_output_sha256),
      ].join(":"), "utf8").digest("hex")
      const existing = await db.from("mobility_decision_replays").select("id,mode,state,equivalent,diff,completed_at")
        .eq("idempotency_key", idempotencyKey).eq("user_id", user.id).maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) return NextResponse.json({ data: { replay: existing.data }, error: null }, { headers: privateHeaders })
      const now = new Date().toISOString()
      const inserted = await db.from("mobility_decision_replays").insert({
        user_id: user.id,
        original_decision_id: decisionId,
        replay_rule_bundle_version_id: ownedDecision.data.rule_bundle_version_id,
        replay_decision_id: null,
        mode: body.mode,
        idempotency_key: idempotencyKey,
        state: "succeeded",
        equivalent,
        diff,
        started_at: now,
        completed_at: now,
      }).select("id,mode,state,equivalent,diff,completed_at").single()
      if (inserted.error?.code === "23505") {
        const raced = await db.from("mobility_decision_replays").select("id,mode,state,equivalent,diff,completed_at")
          .eq("idempotency_key", idempotencyKey).eq("user_id", user.id).maybeSingle()
        if (raced.error) throw raced.error
        if (raced.data) return NextResponse.json({ data: { replay: raced.data }, error: null }, { headers: privateHeaders })
      }
      if (inserted.error) throw inserted.error
      return NextResponse.json({ data: { replay: inserted.data }, error: null }, { status: 201, headers: privateHeaders })
    }

    const canonicalOutput = ownedDecision.data.canonical_output as Record<string, unknown> | null
    const canonicalHash = createHash("sha256").update(stable(canonicalOutput)).digest("hex")
    if (canonicalHash !== ownedDecision.data.canonical_output_sha256) return NextResponse.json(
      { data: null, error: "The recorded decision failed its integrity check.", code: "MOBILITY_REPLAY_INTEGRITY_FAILURE" },
      { status: 409, headers: privateHeaders },
    )
    const recorded = recordedEvaluationSchema.safeParse(canonicalOutput?.executableEvaluation)
    if (!recorded.success) return NextResponse.json(
      { data: null, error: "This historical decision predates executable replay facts.", code: "MOBILITY_REPLAY_INPUTS_UNAVAILABLE" },
      { status: 409, headers: privateHeaders },
    )
    const originalBundle = await db.from("mobility_rule_bundle_versions")
      .select("id,bundle_id,version,rules").eq("id", ownedDecision.data.rule_bundle_version_id).maybeSingle()
    if (originalBundle.error) throw originalBundle.error
    if (!originalBundle.data) return NextResponse.json(
      { data: null, error: "The historical rule bundle is unavailable.", code: "MOBILITY_REPLAY_RULES_UNAVAILABLE" },
      { status: 409, headers: privateHeaders },
    )
    const currentPointer = await db.from("mobility_rule_bundle_current")
      .select("rule_bundle_version_id,activation_id,activated_at")
      .eq("bundle_id", originalBundle.data.bundle_id).maybeSingle()
    if (currentPointer.error) throw currentPointer.error
    if (!currentPointer.data || currentPointer.data.rule_bundle_version_id === originalBundle.data.id) {
      return NextResponse.json(
        { data: null, error: "No approved successor rule bundle is active for this decision.", code: "MOBILITY_SUCCESSOR_REPLAY_UNAVAILABLE" },
        { status: 409, headers: privateHeaders },
      )
    }
    const successorBundle = await db.from("mobility_rule_bundle_versions")
      .select("id,bundle_id,version,state,rules")
      .eq("id", currentPointer.data.rule_bundle_version_id).maybeSingle()
    if (successorBundle.error) throw successorBundle.error
    if (!successorBundle.data
      || successorBundle.data.bundle_id !== originalBundle.data.bundle_id
      || successorBundle.data.state !== "active"
      || successorBundle.data.version <= originalBundle.data.version) {
      return NextResponse.json(
        { data: null, error: "The approved successor rule bundle is invalid.", code: "MOBILITY_SUCCESSOR_REPLAY_RULES_INVALID" },
        { status: 409, headers: privateHeaders },
      )
    }
    let replayed
    try {
      replayed = evaluateMobilityRuleCase(successorBundle.data.rules, {
        caseId: `successor-replay-${decisionId}`,
        facts: recorded.data.evaluatedFacts,
        expectedState: recorded.data.actualState ?? recorded.data.expectedState,
      })
    } catch {
      return NextResponse.json(
        { data: null, error: "The approved successor rule bundle cannot be executed.", code: "MOBILITY_SUCCESSOR_REPLAY_RULES_INVALID" },
        { status: 409, headers: privateHeaders },
      )
    }
    const equivalent = replayed.actualState === recorded.data.actualState
      && replayed.matchedRuleId === recorded.data.matchedRuleId
    const diff = {
      original: {
        ruleBundleVersionId: originalBundle.data.id,
        version: originalBundle.data.version,
        actualState: recorded.data.actualState,
        matchedRuleId: recorded.data.matchedRuleId,
      },
      replayed: {
        ruleBundleVersionId: successorBundle.data.id,
        version: successorBundle.data.version,
        actualState: replayed.actualState,
        matchedRuleId: replayed.matchedRuleId,
      },
      activation: {
        id: currentPointer.data.activation_id,
        activatedAt: currentPointer.data.activated_at,
      },
      changed: !equivalent,
    }
    const idempotencyKey = createHash("sha256").update([
      decisionId, body.mode, String(successorBundle.data.id), String(ownedDecision.data.canonical_output_sha256),
    ].join(":"), "utf8").digest("hex")
    const existing = await db.from("mobility_decision_replays").select("id,mode,state,equivalent,diff,completed_at")
      .eq("idempotency_key", idempotencyKey).eq("user_id", user.id).maybeSingle()
    if (existing.error) throw existing.error
    if (existing.data) return NextResponse.json({ data: { replay: existing.data }, error: null }, { headers: privateHeaders })
    const now = new Date().toISOString()
    const inserted = await db.from("mobility_decision_replays").insert({
      user_id: user.id,
      original_decision_id: decisionId,
      replay_rule_bundle_version_id: successorBundle.data.id,
      replay_decision_id: null,
      mode: body.mode,
      idempotency_key: idempotencyKey,
      state: "succeeded",
      equivalent,
      diff,
      started_at: now,
      completed_at: now,
    }).select("id,mode,state,equivalent,diff,completed_at").single()
    if (inserted.error?.code === "23505") {
      const raced = await db.from("mobility_decision_replays").select("id,mode,state,equivalent,diff,completed_at")
        .eq("idempotency_key", idempotencyKey).eq("user_id", user.id).maybeSingle()
      if (raced.error) throw raced.error
      if (raced.data) return NextResponse.json({ data: { replay: raced.data }, error: null }, { headers: privateHeaders })
    }
    if (inserted.error) throw inserted.error
    return NextResponse.json({ data: { replay: inserted.data }, error: null }, { status: 201, headers: privateHeaders })
  } catch (error) {
    const invalid = error instanceof z.ZodError
    return NextResponse.json(
      { data: null, error: invalid ? "Invalid lineage action" : error instanceof Error ? error.message : "Lineage action failed" },
      { status: invalid ? 400 : 500, headers: privateHeaders },
    )
  }
}
