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

function getFirstTargetCountry(
  profileTargetCountries: string,
  jobLocation: string,
) {
  return (
    profileTargetCountries
      .split(",")
      .map((item) => item.trim())
      .find(Boolean) ||
    jobLocation.trim() ||
    "European Union"
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
  const targetCountry =
    input.context?.targetCountry ??
    getFirstTargetCountry(input.profile.targetCountries, input.job.location);
  const fit = evaluateAutoTimeFitScore({ profile: input.profile, job: input.job });
  const internationalRequirement =
    candidatePosition === "foreign-candidate" ? "required" : "not-relevant";

  let international;
  if (internationalRequirement === "required") {
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

    international = assessInternationalJob({
      country: targetCountry,
      mobilityProfile,
      jobText: input.job.jobDescription,
      roleDuties: input.job.jobDescription,
      occupationMapping: "not-checked",
      stamp4Assessment,
    });
  }

  const combined = orchestrateJobDecision({
    fit,
    international,
    internationalRequirement,
  });
  return {
    blockers: combined.blockers,
    decision: combined.decision,
    missingEvidence,
  };
}

