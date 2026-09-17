import {
  assessInternationalJob,
  evaluateMobilityRuleCase,
  evaluateAutoTimeFitScore,
  assessSponsorshipReadiness,
  getInternationalCountryPack,
  isStamp4SponsorshipCovered,
  migrateCandidateProfileToMobilityProfile,
  orchestrateJobDecision,
  resolveAssessmentCountry,
} from "shared";
import type {
  ApplicationDecisionResult,
  ApplicationPreparationInput,
} from "../../domains/application-preparation/prepare-application-kit";
import {
  loadCurrentMobilityReadiness,
  loadPilotObservationRuleBundleVersionId,
  missingGovernanceReadiness,
  type MobilityGovernanceClient,
  type RuleBundleVersionLookupClient,
} from "./mobility-governance-repository.ts";
import {
  recordExternalAssessmentSnapshot,
  type ExternalAssessmentWriteClient,
} from "../mobility-external-assessment/writer.ts";

/**
 * Concrete EU Fit/mobility adapter used by application preparation. Country
 * resolution delegates to the shared policy: explicit choice, then vacancy
 * country, then profile preference, and never a fabricated fallback.
 */
export async function assessApplicationDecision(
  input: ApplicationPreparationInput,
  governanceClient?: MobilityGovernanceClient,
  snapshotClient?: ExternalAssessmentWriteClient,
  recordingClient?: RuleBundleVersionLookupClient,
): Promise<ApplicationDecisionResult> {
  const missingEvidence = [
    !input.profile.baseCvText.trim() && "CV text",
    !input.profile.targetRoles.trim() && "target roles",
    !input.profile.workRightDetails.trim() && "work-right details",
    !input.job.jobDescription.trim() && "job description",
  ].filter(Boolean) as string[];
  const candidatePosition =
    input.context?.candidatePosition ??
    (input.profile.sponsorshipNeeded ? "foreign-candidate" : "native-candidate");
  const fit = evaluateAutoTimeFitScore({ profile: input.profile, job: input.job });
  const internationalRequirement =
    candidatePosition === "foreign-candidate" ? "required" : "not-relevant";

  if (internationalRequirement === "required") {
    const targetCountry = resolveAssessmentCountry({
      explicitCountry: input.context?.targetCountry,
      vacancyCountry: input.job.location,
      profileTargetCountries: input.profile.targetCountries.split(","),
    });

    if (!targetCountry) {
      return {
        blockers: [],
        decision: "Insufficient evidence",
        missingEvidence: [...missingEvidence, "target country for mobility assessment"],
      };
    }

    return assessWithInternational({ input, fit, targetCountry, missingEvidence, governanceClient, snapshotClient, recordingClient });
  }

  const combined = orchestrateJobDecision({
    fit,
    internationalRequirement,
  });
  return {
    blockers: combined.blockers,
    decision: combined.decision,
    missingEvidence,
  };
}

async function assessWithInternational({
  input,
  fit,
  targetCountry,
  missingEvidence,
  governanceClient,
  snapshotClient,
  recordingClient,
}: {
  input: ApplicationPreparationInput;
  fit: ReturnType<typeof evaluateAutoTimeFitScore>;
  targetCountry: string;
  missingEvidence: string[];
  governanceClient?: MobilityGovernanceClient;
  snapshotClient?: ExternalAssessmentWriteClient;
  recordingClient?: RuleBundleVersionLookupClient;
}): Promise<ApplicationDecisionResult> {
  const mobilityProfile = migrateCandidateProfileToMobilityProfile(input.profile);
  const countryPack = getInternationalCountryPack(targetCountry);
  let stamp4Assessment;
  const externalAssessmentSnapshotIds: string[] = [];

  if (isStamp4SponsorshipCovered(countryPack.id)) {
    const stamp4Request = {
      roleTitle: input.job.jobTitle,
      country: targetCountry,
      salary: null,
      rawText: input.job.jobDescription,
    };
    stamp4Assessment = assessSponsorshipReadiness(stamp4Request);

    // Keep the historical snapshot link used by decision replay. Although
    // execution is now local, the imported ruleset is still an independently
    // versioned decision input and must remain immutable after the decision.
    if (snapshotClient) {
      const snapshot = await recordExternalAssessmentSnapshot({
        client: snapshotClient,
        provider: "autotime-stamp4-integrated",
        endpoint: "shared/assessSponsorshipReadiness",
        request: stamp4Request,
        response: stamp4Assessment as unknown as Record<string, unknown>,
        httpStatus: 200,
        covered: true,
      });
      if (snapshot) externalAssessmentSnapshotIds.push(snapshot.snapshotId);
    }
  }

  const international = assessInternationalJob({
    country: targetCountry,
    mobilityProfile,
    jobText: input.job.jobDescription,
    roleDuties: input.job.jobDescription,
    occupationMapping: "not-checked",
    stamp4Assessment,
  });
  const governed = governanceClient
    ? await loadCurrentMobilityReadiness(governanceClient, targetCountry)
    : null;

  const combined = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement: "required",
    mobilityReadiness: governanceClient
      ? (governed?.readiness ?? missingGovernanceReadiness)
      : undefined,
  });
  const crossCheck = governed
    ? crossCheckExecutableRules({
        combinedDecision: combined.decision,
        fitScore: fit.fitScore,
        international,
        rules: governed.executableRules,
        sponsorshipNeeded: input.profile.sponsorshipNeeded,
        targetCountry,
      })
    : null;

  // Validation-pilot recording only: independent of governanceClient/governed
  // above, this never feeds orchestrateJobDecision and never changes
  // combined.decision/blockers - it only lets the already-computed real
  // decision be persisted for the evaluation corpus. Only attempted when no
  // real governance readiness exists, so it never overrides genuine governed
  // metadata. See docs/reference/landwell-master-execution-plan.md §4.
  const recordingGovernance = !governed && recordingClient
    ? await (async () => {
        const pilotRuleBundleVersionId = await loadPilotObservationRuleBundleVersionId(recordingClient);
        if (!pilotRuleBundleVersionId) return undefined;
        return {
          readinessSnapshotId: null,
          ruleBundleVersionId: pilotRuleBundleVersionId,
          targetCountry,
          outputPermission: "information_only" as const,
          readinessState: "research" as const,
          reasonCodes: ["PILOT_OBSERVATION_RECORDING"],
        };
      })()
    : undefined;

  if (crossCheck && !crossCheck.passed) {
    const reasonCodes = [...new Set([
      ...(governed?.readiness.reasonCodes ?? []),
      crossCheck.reasonCode,
    ])];
    return {
      blockers: [...combined.blockers, "Governed mobility rules could not confirm this recommendation."],
      decision: "Insufficient evidence",
      missingEvidence,
      ...(governed && {
        governance: {
          readinessSnapshotId: governed.snapshotId,
          ruleBundleVersionId: governed.ruleBundleVersionId,
          targetCountry,
          outputPermission: "blocked",
          readinessState: governed.readiness.state,
          reasonCodes,
          executableEvaluation: crossCheck.evaluation,
        },
      }),
      ...(externalAssessmentSnapshotIds.length > 0 && {
        replayInputs: { externalAssessmentSnapshotIds },
      }),
    };
  }
  return {
    blockers: combined.blockers,
    decision: combined.decision,
    missingEvidence,
    ...(governed
      ? {
          governance: {
            readinessSnapshotId: governed.snapshotId,
            ruleBundleVersionId: governed.ruleBundleVersionId,
            targetCountry,
            outputPermission: governed.readiness.outputPermission,
            readinessState: governed.readiness.state,
            reasonCodes: governed.readiness.reasonCodes,
            ...(crossCheck && { executableEvaluation: crossCheck.evaluation }),
          },
        }
      : recordingGovernance
        ? { governance: recordingGovernance }
        : {}),
    ...(externalAssessmentSnapshotIds.length > 0 && {
      replayInputs: { externalAssessmentSnapshotIds },
    }),
  };
}

export function crossCheckExecutableRules({
  combinedDecision,
  fitScore,
  international,
  rules,
  sponsorshipNeeded,
  targetCountry,
}: {
  combinedDecision: ApplicationDecisionResult["decision"];
  fitScore: number;
  international: ReturnType<typeof assessInternationalJob>;
  rules: unknown;
  sponsorshipNeeded: boolean;
  targetCountry: string;
}):
  | { passed: true; reasonCode: null; evaluation: { expectedState: string; actualState: string; matchedRuleId: string | null; passed: true; evaluatedFacts: Record<string, string | number | boolean | null> } }
  | { passed: false; reasonCode: "EXECUTABLE_RULES_UNAVAILABLE" | "LIVE_RULE_ENGINE_MISMATCH"; evaluation: { expectedState: string; actualState: string | null; matchedRuleId: string | null; passed: false; evaluatedFacts: Record<string, string | number | boolean | null> } } {
  const expectedState = combinedDecision === "Skip"
    ? "not_supported"
    : combinedDecision === "Investigate first" || combinedDecision === "Insufficient evidence"
      ? "insufficient_evidence"
      : "potential_match";
  const evaluatedFacts = {
    country: targetCountry,
    fitScore,
    sponsorshipNeeded,
    pathwayStatus: international.pathwayStatus,
    supportLevel: international.supportLevel,
    confirmedBlockerCount: international.confirmedBlockers.length,
    missingEvidenceCount: international.missingEvidence.length,
    stamp4Verified: international.stamp4Verified,
  };
  try {
    const result = evaluateMobilityRuleCase(rules, {
      caseId: "live-decision-cross-check",
      expectedState,
      facts: evaluatedFacts,
    });
    const evaluation = {
      expectedState: result.expectedState,
      actualState: result.actualState,
      matchedRuleId: result.matchedRuleId,
      passed: result.passed,
      evaluatedFacts,
    };
    return result.passed
      ? { passed: true, reasonCode: null, evaluation: { ...evaluation, passed: true } }
      : { passed: false, reasonCode: "LIVE_RULE_ENGINE_MISMATCH", evaluation: { ...evaluation, passed: false } };
  } catch {
    return {
      passed: false,
      reasonCode: "EXECUTABLE_RULES_UNAVAILABLE",
      evaluation: { expectedState, actualState: null, matchedRuleId: null, passed: false, evaluatedFacts },
    };
  }
}
