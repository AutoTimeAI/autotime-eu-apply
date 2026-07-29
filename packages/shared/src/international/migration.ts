import type { CandidateProfile } from "../types.ts";
import { mobilityProfileSchema, type MobilityProfile } from "./types.ts";

export function migrateCandidateProfileToMobilityProfile(
  profile: CandidateProfile,
): MobilityProfile {
  return mobilityProfileSchema.parse({
    schemaVersion: 1,
    currentCountry: profile.currentCountry,
    targetCountries: profile.targetCountries
      .split(",")
      .map((country) => country.trim())
      .filter(Boolean),
    applicantPosition: profile.sponsorshipNeeded
      ? "sponsorship-required"
      : profile.workRightDetails.trim()
        ? "existing-country-permission"
        : "unsure",
    currentPermissionType: profile.workRightDetails || undefined,
    sponsorshipRequired: profile.sponsorshipNeeded ? "yes" : "unsure",
    relocationPreference: profile.relocationWillingness,
    noticePeriod: profile.noticePeriod || undefined,
    notes:
      [
        profile.workRightDetails.trim() &&
          `Legacy work-right details preserved for review: ${profile.workRightDetails}`,
        profile.salaryExpectation.trim() &&
          `Legacy salary expectation preserved for review: ${profile.salaryExpectation}`,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
  });
}
