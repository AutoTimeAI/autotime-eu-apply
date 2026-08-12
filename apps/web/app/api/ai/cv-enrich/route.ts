import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { fetchPortfolioText } from "../../../../lib/cv/sources/portfolio";
import { assertAiRouteRateLimit, extractCvEnrichmentWithOpenAI, RateLimitError } from "../../../../lib/openai-server";
import { assertCanUseAi, FeatureGateError, trackAiCall } from "../../../../lib/feature-gate";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("linkedin_text"), content: z.string().trim().min(80).max(50_000) }),
  z.object({ source: z.literal("portfolio"), url: z.string().url().max(2_000) }),
]);

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const body = schema.parse(await request.json());
    await assertAiRouteRateLimit(user.id);
    await assertCanUseAi(user.id);
    const source = body.source === "portfolio" ? await fetchPortfolioText(body.url) : { text: body.content, url: "LinkedIn pasted text" };
    const result = await extractCvEnrichmentWithOpenAI({ content: source.text, sourceLabel: source.url });
    await trackAiCall(user.id, { feature: `cv-enrichment-${body.source}`, model: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: result.costUsd });
    return NextResponse.json({ data: { ...result.value, sourceLabel: source.url, notes: ["AI-extracted suggestion. Verify every claim before applying it to your CV."] }, error: null });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : error instanceof FeatureGateError ? 402 : error instanceof RateLimitError ? 429 : 500;
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "CV enrichment failed" }, { status });
  }
}
