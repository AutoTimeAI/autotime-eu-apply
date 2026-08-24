/** Tailors CV content to a job while retaining evidence and usage boundaries. */
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
import { boundedCvSchema } from "../../../../lib/content-security";
const schema = z.object({
  cv: boundedCvSchema,
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
