import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { enrichCvFromGitHub } from "../../../../lib/cv/sources/github";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema = z.object({ username: z.string().trim().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i), token: z.string().trim().max(255).optional() });

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
