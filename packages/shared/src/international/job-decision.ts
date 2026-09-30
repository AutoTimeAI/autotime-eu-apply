// Single entry point for "what is AutoTime's decision on this job" on the
// client-side surfaces (dashboard, tracking). Before this existed the
// dashboard issued its decision from the deprecated evaluateCountryFit
// average alone, so two known failures reached users:
//   - an unconfirmed sponsorship path (component score 42, "needs manual
//     confirmation") was averaged up to "Apply now" with the content gate
//     open, and
//   - a role-fit score of 35/"Low fit" still produced "Stretch application"
//     because skill match is not a hard-blocker component.
// This keeps evaluateCountryFit for its component breakdown, but the final
// decision is now the STRICTER of the legacy decision and
// orchestrateJobDecision - so the orchestrator can only tighten a decision,
// never loosen one (legacy relocation/location blockers still hold).
import {
  evaluateCountryFit,
  getContentGateCopy,
  type AutoTimeFitReview,
  type CountryFitEvaluation,
  type OutcomeLearningSignals,
  type CandidateMarketPosition,
} from "../fit-model.ts";
import {
  getContentGenerationGate,
  type CountryFitDecision,
} from "../eu-fit/decision-policy.ts";
import type { CandidateProfile, JobAnalysisDraft } from "../types.ts";
import {
  assessInternationalJob,
  getInternationalCountryPack,
  resolveAssessmentCountry,
} from "./assessment.ts";
import { migrateCandidateProfileToMobilityProfile } from "./migration.ts";
import {
  orchestrateJobDecision,
  type CombinedJobDecision,
  type InternationalEvidenceRequirement,
} from "./orchestration.ts";
import { assessSponsorshipReadiness } from "./sponsorship-readiness.ts";
import { isStamp4SponsorshipCovered } from "./stamp4-client.ts";
import type { InternationalAssessment, InternationalDecision } from "./types.ts";

/**
 * Whether cross-border evidence is required for this candidate. An explicit
 * "native-candidate" choice is respected unless the profile itself says
 * sponsorship is needed. With no explicit choice, an empty work-right field
 * is treated as "unsure" and the check runs - matching assessment.ts's rule
 * that "unsure" must never be handled more permissively than "yes".
 */
export function resolveInternationalRequirement({
  candidatePosition,
  profile,
}: {
  candidatePosition?: CandidateMarketPosition | null;
  profile: Pick<CandidateProfile, "sponsorshipNeeded" | "workRightDetails">;
}): InternationalEvidenceRequirement {
  if (candidatePosition === "foreign-candidate" || profile.sponsorshipNeeded) {
    return "required";
  }

  if (candidatePosition === "native-candidate") {
    return "not-relevant";
  }

  return profile.workRightDetails.trim() ? "not-relevant" : "required";
}

const strictnessRank: Record<CountryFitDecision, number> = {
  "Skip for now": 0,
  "Improve profile first": 1,
  "Stretch application": 2,
  "Apply now": 3,
};

/**
 * Maps the orchestrator's vocabulary onto the legacy dashboard vocabulary
 * (which is also persisted, see apps/web/lib/supabase/types.ts).
 * "Investigate first" and "Insufficient evidence" both close the content
 * gate; the orchestrator's own nextAction explains what to verify.
 */
export function toCountryFitDecision(
  decision: InternationalDecision,
): CountryFitDecision {
  switch (decision) {
    case "Apply":
      return "Apply now";
    case "Stretch application":
      return "Stretch application";
    case "Skip":
      return "Skip for now";
    case "Investigate first":
    case "Insufficient evidence":
      return "Improve profile first";
  }
}

function unique(items: string[]) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

export type JobDecisionResult = {
  /** Legacy-shaped evaluation with decision, gate, copy and blockers reconciled. */
  evaluation: CountryFitEvaluation;
  /** The orchestrator's combined decision and evidence trail. */
  combined: CombinedJobDecision;
  /** Present when the international check ran. */
  international?: InternationalAssessment;
};

export function evaluateJobDecision({
  profile,
  job,
  fit,
  context,
}: {
  profile: CandidateProfile;
  job: JobAnalysisDraft;
  fit: AutoTimeFitReview;
  context: {
    candidatePosition: CandidateMarketPosition;
    targetCountry: string;
    outcomeSignals?: OutcomeLearningSignals;
  };
}): JobDecisionResult {
  const legacy = evaluateCountryFit({ profile, job, context });
  const internationalRequirement = resolveInternationalRequirement({
    candidatePosition: context.candidatePosition,
    profile,
  });

  let international: InternationalAssessment | undefined;
  if (internationalRequirement === "required") {
    const country = resolveAssessmentCountry({
      explicitCountry: context.targetCountry,
      vacancyCountry: job.location,
      profileTargetCountries: profile.targetCountries.split(","),
    });

    if (country) {
      const pack = getInternationalCountryPack(country);
      const stamp4Assessment = isStamp4SponsorshipCovered(pack.id)
        ? assessSponsorshipReadiness({
            roleTitle: job.jobTitle,
            country,
            salary: null,
            rawText: job.jobDescription,
          })
        : undefined;

      international = assessInternationalJob({
        country,
        mobilityProfile: migrateCandidateProfileToMobilityProfile(profile),
        jobText: job.jobDescription,
        roleDuties: job.jobDescription,
        occupationMapping: "not-checked",
        stamp4Assessment,
      });
    }
  }

  const combined = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement,
  });
  const orchestrated = toCountryFitDecision(combined.decision);
  const orchestratorIsStricter =
    strictnessRank[orchestrated] < strictnessRank[legacy.decision];
  const decision = orchestratorIsStricter ? orchestrated : legacy.decision;
  const contentGate = getContentGenerationGate(decision);
  const copy = getContentGateCopy(contentGate);

  return {
    evaluation: {
      ...legacy,
      decision,
      contentGate,
      positioningAngle: copy.positioningAngle,
      nextBestAction: orchestratorIsStricter
        ? combined.nextAction
        : copy.nextBestAction,
      blockers: unique([
        ...legacy.blockers,
        ...(international?.confirmedBlockers ?? []),
      ]),
      evidenceChecklist: unique([
        ...legacy.evidenceChecklist,
        ...(international?.missingEvidence ?? []).map(
          (item) => `Verify: ${item}`,
        ),
      ]),
    },
    combined,
    international,
  };
}
