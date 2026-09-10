import {
  assessInternationalJob,
  evaluateAutoTimeFitScore,
  fetchStamp4SponsorshipAssessment,
  getInternationalCountryPack,
  isStamp4SponsorshipCovered,
  migrateCandidateProfileToMobilityProfile,
  orchestrateJobDecision,
} from "shared";
import type {
  ApplicationDecisionResult,
  ApplicationPreparationInput,
} from "../../domains/application-preparation/prepare-application-kit";

/**
 * The first explicitly supplied target country, or null if none was -
 * never a fabricated fallback. A prior version defaulted to "European
 * Union" here, which meant a candidate who had not yet set a target
 * country still got a full country-specific mobility assessment run
 * against a made-up jurisdiction (see acceptance-gate-audit-2026-09-10.md
 * gate 1) - the exact "invent certainty" behavior the strategy's own EU
 * Fit quality standard forbids.
 */
function resolveTargetCountry(
  profileTargetCountries: string,
  jobLocation: string,
): string | null {
  return (
    profileTargetCountries
      .split(",")
      .map((item) => item.trim())
      .find(Boolean) ||
    jobLocation.trim() ||
    null
  );
}

/** Concrete EU Fit/mobility adapter used by application preparation. */
export async function assessApplicationDecision(
  input: ApplicationPreparationInput,
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
    const targetCountry =
      input.context?.targetCountry ||
      resolveTargetCountry(input.profile.targetCountries, input.job.location);

    if (!targetCountry) {
      return {
        blockers: [],
        decision: "Insufficient evidence",
        missingEvidence: [...missingEvidence, "target country for mobility assessment"],
      };
    }

    return assessWithInternational({ input, fit, targetCountry, missingEvidence });
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
}: {
  input: ApplicationPreparationInput;
  fit: ReturnType<typeof evaluateAutoTimeFitScore>;
  targetCountry: string;
  missingEvidence: string[];
}): Promise<ApplicationDecisionResult> {
  const mobilityProfile = migrateCandidateProfileToMobilityProfile(input.profile);
  const countryPack = getInternationalCountryPack(targetCountry);
  let stamp4Assessment;

  if (isStamp4SponsorshipCovered(countryPack.id)) {
    const baseUrl = process.env.STAMP4_SPONSORSHIP_SERVICE_URL;
    const secret = process.env.STAMP4_SPONSORSHIP_SERVICE_SECRET;
    if (baseUrl && secret) {
      stamp4Assessment =
        (await fetchStamp4SponsorshipAssessment(
          {
            roleTitle: input.job.jobTitle,
            country: targetCountry,
            salary: null,
            rawText: input.job.jobDescription,
          },
          { baseUrl, secret },
        )) ?? undefined;
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

  const combined = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement: "required",
  });
  return {
    blockers: combined.blockers,
    decision: combined.decision,
    missingEvidence,
  };
}

