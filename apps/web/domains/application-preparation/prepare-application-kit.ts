import {
  assessDraftEligibility,
  type ApplicationContentDraft,
  type CandidateProfile,
  type InternationalDecision,
  type JobAnalysisDraft,
  type ReusableAnswers,
} from "shared";

export type ApplicationPreparationInput = {
  profile: CandidateProfile;
  job: JobAnalysisDraft;
  reusableAnswers: ReusableAnswers | null;
  context?: {
    candidatePosition: "foreign-candidate" | "native-candidate";
    targetCountry: string;
  };
};

export type ApplicationDecisionResult = {
  blockers: string[];
  decision: InternationalDecision;
  missingEvidence: string[];
};

export type GeneratedApplicationKit = {
  completionTokens: number;
  costUsd: number;
  model: string;
  promptTokens: number;
  value: ApplicationContentDraft;
};

export type ApplicationPreparationPorts = {
  decisions: {
    assess(input: ApplicationPreparationInput): Promise<ApplicationDecisionResult>;
  };
  generator: {
    generate(input: ApplicationPreparationInput): Promise<GeneratedApplicationKit>;
  };
  lifecycle?: {
    generationStarted(): void;
  };
  usage: {
    assertAllowed(userId: string): Promise<void>;
    finalize(
      reservationId: string | null,
      usage: Omit<GeneratedApplicationKit, "value">,
    ): Promise<void>;
    release(reservationId: string | null): Promise<void>;
    reserve(userId: string): Promise<string | null>;
  };
};

export class ApplicationPreparationBlockedError extends Error {
  readonly blockers: string[];

  constructor(blockers: string[]) {
    super(`Content generation blocked: ${blockers.join(" ")}`);
    this.name = "ApplicationPreparationBlockedError";
    this.blockers = blockers;
  }
}

/**
 * Coordinates one application-kit generation without depending on Next.js,
 * Supabase, OpenAI, Sentry or a concrete mobility provider.
 */
export async function prepareApplicationKit({
  input,
  ports,
  userId,
}: {
  input: ApplicationPreparationInput;
  ports: ApplicationPreparationPorts;
  userId: string;
}): Promise<GeneratedApplicationKit> {
  await ports.usage.assertAllowed(userId);
  const reservationId = await ports.usage.reserve(userId);
  let providerCompleted = false;

  try {
    const decision = await ports.decisions.assess(input);
    const eligibility = assessDraftEligibility({
      decision: decision.decision,
      decisionBlockers: decision.blockers,
      missingEvidence: decision.missingEvidence,
    });

    if (eligibility.stage === "blocked") {
      throw new ApplicationPreparationBlockedError(eligibility.blockers);
    }

    ports.lifecycle?.generationStarted();
    const result = await ports.generator.generate(input);
    providerCompleted = true;
    await ports.usage.finalize(reservationId, {
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
      model: result.model,
      promptTokens: result.promptTokens,
    });
    return result;
  } catch (error: unknown) {
    // A reservation is refundable until the paid provider has completed.
    // Finalization failures retain the reservation because usage occurred.
    if (!providerCompleted) {
      await ports.usage.release(reservationId);
    }
    throw error;
  }
}
