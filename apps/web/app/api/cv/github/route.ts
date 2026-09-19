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
import { enrichCvFromGitHub, GitHubImportError } from "../../../../lib/cv/sources/github";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { toPublicApiError } from "../../../../lib/public-api-error";

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
// enrichCvFromGitHub can fan out to well over a dozen outbound GitHub API
// calls per invocation (repos, an optional GraphQL pinned-repos call, then
// languages/README/commits for up to 5 featured repos) - deliberately more
// conservative than the AI routes' own 20-per-60s limit, since a spammed
// authenticated user could otherwise exhaust GitHub's shared 60/hour
// unauthenticated rate limit for the server's own outbound IP, degrading
// this feature for every other user regardless of token use.
const githubImportRateLimitWindowSeconds = 300;
const githubImportRateLimitMaxRequests = 5;

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });

    const { data: withinLimit, error: rateLimitError } = await createAdminClient().rpc(
      "increment_ai_rate_limit",
      {
        p_rate_limit_key: `github-cv-import:${user.id}`,
        p_window_seconds: githubImportRateLimitWindowSeconds,
        p_max_requests: githubImportRateLimitMaxRequests,
      },
    );

    if (rateLimitError) {
      throw new Error(rateLimitError.message);
    }

    if (!withinLimit) {
      return NextResponse.json(
        { data: null, error: "Too many GitHub import requests. Please try again shortly." },
        { status: 429 },
      );
    }

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
    const status = error instanceof z.ZodError ? 400 : error instanceof GitHubImportError ? 400 : 502;
    const message = error instanceof Error ? error.message : "GitHub enrichment failed";
    return NextResponse.json({ data: null, error: toPublicApiError(message, status) }, { status });
  }
}
