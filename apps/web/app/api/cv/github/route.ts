/**
 * POST /api/cv/github
 *
 * Enriches a CV draft from a public (or token-authenticated) GitHub
 * profile, and maps the extracted skills to ESCO skill records.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401. Note: `token` in the request body
 * is the caller-supplied GitHub token used to call the GitHub API (via
 * `enrichCvFromGitHub`), not an app auth mechanism.
 *
 * Behaviour: for each extracted skill (up to 20), does a case-insensitive
 * `ilike` lookup against `esco_skills` (English only) and picks the best
 * match (exact label match first, then shortest label) as a suggestion.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { enrichCvFromGitHub } from "../../../../lib/cv/sources/github";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema = z.object({ username: z.string().trim().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i), token: z.string().trim().max(255).optional() });

/**
 * Validates `{ username, token? }` against `schema`, fetches and enriches
 * a CV draft from the given GitHub profile, and attaches ESCO skill
 * suggestions for the extracted skills.
 *
 * Responses:
 * - 200 (default status): `{ data: { ...enrichedCv, escoSuggestions },
 *   error: null }`.
 * - 400: request body fails schema validation.
 * - 401: no authenticated user.
 * - 502: GitHub enrichment or unexpected failure.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const body = schema.parse(await request.json());
    const data = await enrichCvFromGitHub(body.username, body.token || undefined);
    const client = createAdminClient();
    const escoSuggestions = (await Promise.all((data.skills ?? []).slice(0, 20).map(async (sourceSkill) => {
      const escaped = sourceSkill.replace(/[%,_]/g, "");
      const { data: candidates } = await client.from("esco_skills").select("id,preferred_label").ilike("preferred_label", `%${escaped}%`).eq("language", "en").limit(20);
      const ranked = (candidates ?? []).sort((a, b) => {
        const exactA = a.preferred_label.toLowerCase() === sourceSkill.toLowerCase() ? 0 : 1;
        const exactB = b.preferred_label.toLowerCase() === sourceSkill.toLowerCase() ? 0 : 1;
        return exactA - exactB || a.preferred_label.length - b.preferred_label.length;
      });
      const match = ranked[0];
      return match ? { escoSkillId: match.id, preferredLabel: match.preferred_label, sourceSkill } : null;
    }))).filter((item): item is NonNullable<typeof item> => item !== null);
    return NextResponse.json({ data: { ...data, escoSuggestions }, error: null });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "GitHub enrichment failed" }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
