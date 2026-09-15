import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"
import { mobilityEvaluationFixtureSchema } from "shared"
import { isSameOriginMutation, requireAdminRequest } from "../../../../../lib/admin-authorization"
import { safeAdminError } from "../../../../../lib/admin-safe-response"
import { createAdminClient } from "../../../../../lib/supabase/admin"
const schema = z.object({ jurisdiction: z.string().trim().min(2).max(120), version: z.number().int().positive(), fixtures: z.array(mobilityEvaluationFixtureSchema).min(1).max(200), confirm: z.literal(true) })
type UntypedClient = SupabaseClient<any>
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`; return JSON.stringify(value) }
export async function POST(request: Request) {
  try {
    const principal = await requireAdminRequest(request, "mobility_fixtures:register")
    if (!isSameOriginMutation(request)) return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 })
    const body = schema.parse(await request.json())
    if (new Set(body.fixtures.map((fixture) => fixture.caseId)).size !== body.fixtures.length) return NextResponse.json({ data: null, error: "Fixture case identifiers must be unique" }, { status: 400 })
    const hash = createHash("sha256").update(stable(body.fixtures)).digest("hex")
    const db = createAdminClient() as unknown as UntypedClient
    const result = await db.rpc("admin_register_mobility_fixture_set", { p_actor_user_id: principal.user.id, p_jurisdiction: body.jurisdiction, p_version: body.version, p_fixtures: body.fixtures, p_fixtures_sha256: hash })
    if (result.error || typeof result.data !== "string") throw new Error("mobility_fixture_registration_failed")
    return NextResponse.json({ data: { fixtureSetId: result.data, sha256: hash }, error: null }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ data: null, error: "Invalid mobility fixture set" }, { status: 400 })
    return safeAdminError(error, "mobility_fixture_registration")
  }
}
