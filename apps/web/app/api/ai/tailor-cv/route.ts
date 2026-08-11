import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  assertAiRouteRateLimit,
  RateLimitError,
  tailorCvWithOpenAI,
} from "../../../../lib/openai-server";
import {
  assertCanUseAi,
  FeatureGateError,
  trackAiCall,
} from "../../../../lib/feature-gate";
const cvSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
  }),
  summary: z.string(),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      dates: z.string(),
    }),
  ),
  skills: z.array(z.string()),
});
const schema = z.object({
  cv: cvSchema,
  jobDescription: z.string().trim().min(80).max(50000),
});
export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user)
      return NextResponse.json(
        { data: null, error: "Unauthorised" },
        { status: 401 },
      );
    const body = schema.parse(await request.json());
    await assertAiRouteRateLimit(user.id);
    await assertCanUseAi(user.id);
    const result = await tailorCvWithOpenAI(body);
    await trackAiCall(user.id, {
      feature: "cv-tailoring",
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
    });
    return NextResponse.json({ data: { cv: result.value }, error: null });
  } catch (error) {
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof FeatureGateError
          ? 402
          : error instanceof RateLimitError
            ? 429
            : 500;
    return NextResponse.json(
      {
        data: null,
        error: error instanceof Error ? error.message : "CV tailoring failed",
      },
      { status },
    );
  }
}
