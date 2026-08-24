// One-way adapter from the legacy CandidateProfile shape (free-text
// work-right/target-country fields, ../schemas.ts) to the newer, more
// structured MobilityProfile the International module reasons over. Exists
// so existing onboarding data doesn't need a destructive migration - callers
// derive a MobilityProfile on demand instead of both apps having to
// rewrite/re-validate every stored profile up front.
import type { CandidateProfile } from "../types.ts";
import { mobilityProfileSchema, type MobilityProfile } from "./types.ts";

/**
 * Converts a legacy CandidateProfile into a MobilityProfile: splits the
 * comma-separated `targetCountries` string into an array, infers
 * `applicantPosition` from `sponsorshipNeeded`/`workRightDetails` (best
 * effort - falls back to "unsure" when neither is informative), and
 * preserves the old free-text work-right/salary-expectation fields verbatim
 * inside `notes` so no legacy detail is silently dropped. Throws if the
 * derived object fails mobilityProfileSchema validation.
 */
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
