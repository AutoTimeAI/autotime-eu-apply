import {
  fullCountryDisplayNames,
  supportedExplorerCountries,
  type MobilityProfile,
} from "shared";

export type InternationalSection =
  | "overview"
  | "country"
  | "mobility"
  | "employers"
  | "sources";

// Derived from the engine's own country-pack registry (not a separately
// maintained list) since 2026-09-17 - it had silently drifted before: the
// UK country pack was added with supportLevel: "full" in
// packages/shared/src/international/assessment.ts, but this list was
// never updated to match, so a UK-targeting candidate could never select
// it as a full-support country here and fell through to the generic
// "Other Europe: explore and verify" tier instead, understating a
// capability the engine already had. Deriving from the shared export
// means this can't drift again the same way.
export const fullCountries = fullCountryDisplayNames;
export const allCountries = [...fullCountries, ...supportedExplorerCountries];

export const positionLabels: Record<
  MobilityProfile["applicantPosition"],
  string
> = {
  "international-applicant": "International applicant",
  "local-work-authorised": "Local work-authorised applicant",
  "eu-eea-swiss-citizen": "EU/EEA or Swiss citizen",
  "existing-country-permission": "Existing country-specific work permission",
  "sponsorship-required": "Sponsorship required",
  unsure: "Unsure",
};

export function profileCompleteness(profile: MobilityProfile) {
  const checks = [
    profile.currentCountry,
    profile.targetCountries.length,
    profile.applicantPosition !== "unsure",
    profile.sponsorshipRequired !== "unsure",
    profile.relocationPreference,
    profile.lastVerifiedAt,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
