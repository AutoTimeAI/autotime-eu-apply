// The single point where the two independent judgments AutoTime makes about
// a job - role/skill fit (fit-model.ts's AutoTimeFitReview) and cross-border
// legal viability (assessment.ts's InternationalAssessment) - are combined
// into one final decision. See orchestrateJobDecision's own doc comment for
// why this boundary exists and must not be bypassed.
import type { AutoTimeFitReview } from "../fit-model.ts";
import type {
  InternationalAssessment,
  InternationalDecision,
  OfficialSourceCitation,
} from "./types.ts";

/** Whether international (cross-border) evidence is even relevant to a given job/candidate pairing - e.g. "not-relevant" for a candidate applying in their own country with existing work rights. */
export type InternationalEvidenceRequirement =
  | "not-relevant"
  | "required"
  | "unknown";

/** The final, single decision for a job after reconciling role fit and international evidence - the return shape of orchestrateJobDecision. */
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
    // fit.riskAreas falls back to a single reassuring "No serious blocker
    // detected..." entry (fit-model.ts) when there are genuinely no risk
    // areas - the one fit.riskAreas string that always contains "block" on
    // a clean fit. DashboardExperience.tsx's own risk-area display already
    // excludes it by this same prefix; without the same exclusion here, a
    // candidate with a perfectly clean fit review was misclassified as
    // blocked purely because the all-clear message contains the substring
    // "block" - discovered via a real end-to-end content-generation run
    // (docs/reports/acceptance-gate-audit-2026-09-10.md gate 19), not by
    // any unit test, since every existing fixture passes riskAreas: []
    // directly rather than exercising this fallback.
    blockers: unique([
      ...fit.riskAreas.filter(
        (item) =>
          item.toLowerCase().includes("block") &&
          !item.startsWith("No serious blocker"),
      ),
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
