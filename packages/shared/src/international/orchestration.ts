import type { AutoTimeFitReview } from "../fit-model.ts";
import type {
  InternationalAssessment,
  InternationalDecision,
  OfficialSourceCitation,
} from "./types.ts";

export type InternationalEvidenceRequirement =
  | "not-relevant"
  | "required"
  | "unknown";

export type CombinedJobDecision = {
  decision: InternationalDecision;
  roleFitScore: number;
  evidenceUsed: string[];
  missingEvidence: string[];
  blockers: string[];
  assumptions: string[];
  nextAction: string;
  officialSources: OfficialSourceCitation[];
};

function unique(items: string[]) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function fitDecision(fit: AutoTimeFitReview): InternationalDecision {
  if (fit.fitScore < 50) return "Skip";
  if (fit.fitScore < 65) return "Stretch application";
  return "Apply";
}

/**
 * The only boundary allowed to issue a final cross-domain job decision.
 *
 * The fit review remains authoritative for role/skill/CV/readiness evidence.
 * InternationalAssessment remains authoritative for country, work-right,
 * sponsorship, relocation and pathway evidence. AI-generated text may explain
 * this result but must never replace or mutate it.
 */
export function orchestrateJobDecision({
  fit,
  international,
  internationalRequirement = "not-relevant",
}: {
  fit: AutoTimeFitReview;
  international?: InternationalAssessment;
  internationalRequirement?: InternationalEvidenceRequirement;
}): CombinedJobDecision {
  const fitOnlyDecision = fitDecision(fit);
  const missingInternational =
    internationalRequirement !== "not-relevant" && !international;

  let decision: InternationalDecision = fitOnlyDecision;
  if (missingInternational) {
    decision = "Insufficient evidence";
  } else if (international?.confirmedBlockers.length) {
    decision = "Skip";
  } else if (
    international?.supportLevel === "explorer" ||
    international?.decision === "Investigate first"
  ) {
    decision = "Investigate first";
  } else if (fitOnlyDecision === "Skip") {
    decision = "Skip";
  } else if (fitOnlyDecision === "Stretch application") {
    decision = "Stretch application";
  }

  return {
    decision,
    roleFitScore: fit.fitScore,
    evidenceUsed: unique([
      ...fit.matchedSignals,
      ...(international?.evidenceUsed ?? []),
    ]),
    missingEvidence: unique([
      ...fit.missingSignals,
      ...(international?.missingEvidence ?? []),
      ...(missingInternational
        ? [
            "International evidence required for this applicant and hiring country",
          ]
        : []),
    ]),
    blockers: unique([
      ...fit.riskAreas.filter((item) => item.toLowerCase().includes("block")),
      ...(international?.confirmedBlockers ?? []),
    ]),
    assumptions: unique([
      ...(international?.assumptions ?? []),
      ...(internationalRequirement === "not-relevant"
        ? ["International evidence is not required for this decision."]
        : []),
    ]),
    nextAction:
      decision === "Insufficient evidence"
        ? "Confirm the applicant position and required International evidence before deciding."
        : decision === "Skip" && international?.confirmedBlockers.length
          ? international.nextAction
          : decision === "Investigate first" && international
            ? international.nextAction
            : fit.suggestedNextAction,
    officialSources: international?.sources ?? [],
  };
}
