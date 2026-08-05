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
import {
  createRoleIntelligenceProvider,
  RoleIntelligenceUnavailableError,
} from "../../../../lib/role-intelligence";

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
    const provider = createRoleIntelligenceProvider();
    const extracted = await provider.extractCandidateEvidence({
      text: input.candidateText,
    });
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
          aiMode: process.env.ROLE_PATHWAYS_AI_MODE || "mock",
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
