import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { enrichCvFromGitHub } from "../../../../lib/cv/sources/github";

const schema = z.object({ username: z.string().trim().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i), token: z.string().trim().max(255).optional() });

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const body = schema.parse(await request.json());
    const data = await enrichCvFromGitHub(body.username, body.token || undefined);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "GitHub enrichment failed" }, { status: error instanceof z.ZodError ? 400 : 502 });
  }
}
