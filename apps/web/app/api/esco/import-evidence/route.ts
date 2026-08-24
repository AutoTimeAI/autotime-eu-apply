/**
 * POST /api/esco/import-evidence
 *
 * Bulk-imports a set of ESCO skill IDs into the caller's
 * `user_skill_profile` as low-confidence, "inferred" evidence (e.g. from
 * an external CV/evidence source that already resolved skill IDs).
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401.
 *
 * Behaviour: deduplicates the requested IDs, validates each against the
 * `esco_skills` table (silently dropping unknown IDs), and skips any skill
 * already present in the user's profile — only genuinely new, valid
 * skills are inserted, each with `confidence: 0.55` and
 * `source: "inferred"`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema = z.object({ escoSkillIds: z.array(z.string().trim().min(1)).max(20) });

/**
 * Validates `{ escoSkillIds }` (up to 20) against `schema`, filters to
 * valid/new ESCO skill IDs, and inserts them into the caller's skill
 * profile.
 *
 * Responses:
 * - 200 (default status): `{ data: { inserted: <count> }, error: null }`.
 * - 400: request body fails schema validation.
 * - 401: no authenticated user.
 * - 500: unexpected error.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const { escoSkillIds } = schema.parse(await request.json());
    const ids = [...new Set(escoSkillIds)];
    if (!ids.length) return NextResponse.json({ data: { inserted: 0 }, error: null });
    const client = createAdminClient();
    const { data: valid, error: validError } = await client.from("esco_skills").select("id").in("id", ids);
    if (validError) throw validError;
    const validIds = (valid ?? []).map((item) => item.id);
    const { data: existing, error: existingError } = await client.from("user_skill_profile").select("esco_skill_id").eq("user_id", user.id).in("esco_skill_id", validIds);
    if (existingError) throw existingError;
    const existingIds = new Set((existing ?? []).map((item) => item.esco_skill_id));
    const rows = validIds.filter((id) => !existingIds.has(id)).map((esco_skill_id) => ({ user_id: user.id, esco_skill_id, confidence: 0.55, source: "inferred" as const }));
    if (rows.length) { const { error } = await client.from("user_skill_profile").insert(rows); if (error) throw error; }
    return NextResponse.json({ data: { inserted: rows.length }, error: null });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Evidence import failed" }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
