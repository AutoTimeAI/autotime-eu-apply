import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cachedEscoTechnologySubset,
  competencyEvidenceSchema,
  discoverRolePathways,
  normalisedEuropeanJobSchema,
  rolePreferencesSchema,
} from "shared";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "../../../../lib/configuration-error";
import { assertAiRouteRateLimit, RateLimitError } from "../../../../lib/openai-server";
import {
  FeatureGateError,
  finalizeAiCall,
  releaseAiCall,
  reserveAiCall,
} from "../../../../lib/feature-gate";
import {
  createRoleIntelligenceProvider,
  RoleIntelligenceUnavailableError,
} from "../../../../lib/role-intelligence";

function getUpgradeUrl(request: Request): string {
  return new URL("/pricing", request.url).toString();
}

const requestSchema = z
  .object({
    candidateText: z.string().min(1).max(80_000),
    preferences: rolePreferencesSchema,
    jobs: z.array(normalisedEuropeanJobSchema).max(200).default([]),
    confirmedEvidence: z.array(competencyEvidenceSchema).max(100).default([]),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const { user } = await getRequestUser(request);
    if (!user?.id.trim())
      return NextResponse.json(
        { data: null, error: "Unauthorised" },
        { status: 401 },
      );
    const input = requestSchema.parse(await request.json());
    await assertAiRouteRateLimit(user.id);
    const aiMode = process.env.ROLE_PATHWAYS_AI_MODE?.trim() || "mock";
    const provider = createRoleIntelligenceProvider();
    // Mock mode makes no external request and costs nothing, so it isn't
    // gated behind the same subscription/credit check as every other
    // AI-backed route - only the real (nvidia) path reserves a call.
    const reservationId =
      aiMode === "mock" ? null : await reserveAiCall(user.id);
    let extracted;
    try {
      extracted = await provider.extractCandidateEvidence({
        text: input.candidateText,
      });
    } catch (error: unknown) {
      await releaseAiCall(reservationId);
      throw error;
    }
    if (reservationId) {
      const usage = provider.lastUsage;
      await finalizeAiCall(reservationId, {
        feature: "role-pathways-evidence",
        model: usage?.model ?? aiMode,
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        // NVIDIA's developer-tier endpoint is currently free (see
        // docs/role-pathways.md); revisit if a production NIM/self-hosted
        // endpoint with real per-token pricing replaces it.
        costUsd: 0,
      });
    }
    const evidence = [...input.confirmedEvidence, ...extracted.evidence];
    const recommendations = discoverRolePathways(
      cachedEscoTechnologySubset,
      evidence,
      input.preferences,
      input.jobs,
      input.preferences.countries[0],
      false,
    );
    return NextResponse.json({
      data: {
        evidence,
        ambiguous: extracted.ambiguous,
        recommendations,
        metadata: {
          escoVersion: "esco-fixture-2026.1",
          generatedAt: new Date().toISOString(),
          aiMode,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    if (isConfigurationUnavailableError(error))
      return NextResponse.json(
        { data: null, error: configurationUnavailableMessage },
        { status: 503 },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { data: null, error: "Role Pathways input is invalid." },
        { status: 400 },
      );
    if (error instanceof RateLimitError)
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 429 },
      );
    if (error instanceof FeatureGateError)
      return NextResponse.json(
        {
          data: { upgradeUrl: getUpgradeUrl(request) },
          error: error.message,
        },
        { status: 402 },
      );
    const unavailable = error instanceof RoleIntelligenceUnavailableError;
    console.error("Role Pathways generation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return NextResponse.json(
      {
        data: null,
        error: unavailable
          ? error.message
          : "Role Pathways generation failed safely.",
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
