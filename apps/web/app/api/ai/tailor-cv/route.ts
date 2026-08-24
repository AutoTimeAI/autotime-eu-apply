import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  assertAiRouteRateLimit,
  RateLimitError,
  tailorCvWithOpenAI,
} from "../../../../lib/openai-server";
import {
  reserveAiCall,
  releaseAiCall,
  FeatureGateError,
  finalizeAiCall,
} from "../../../../lib/feature-gate";
const cvSchema = z.object({
  contact: z.object({
    name: z.string().max(200),
    email: z.string().max(200),
    phone: z.string().max(50),
    location: z.string().max(200),
    linkedin: z.string().max(300).optional(),
  }),
  summary: z.string().max(4000),
  experience: z
    .array(
      z.object({
        title: z.string().max(200),
        company: z.string().max(200),
        dates: z.string().max(100),
        bullets: z.array(z.string().max(1000)).max(40),
      }),
    )
    .max(40),
  education: z
    .array(
      z.object({
        degree: z.string().max(200),
        institution: z.string().max(200),
        dates: z.string().max(100),
      }),
    )
    .max(20),
  skills: z.array(z.string().max(100)).max(200),
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
    const reservationId = await reserveAiCall(user.id);
    let result;
    try {
      result = await tailorCvWithOpenAI(body);
    } catch (error) {
      await releaseAiCall(reservationId);
      throw error;
    }
    await finalizeAiCall(reservationId, {
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
