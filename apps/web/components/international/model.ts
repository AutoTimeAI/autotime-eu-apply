import { supportedExplorerCountries, type MobilityProfile } from "shared";

export type InternationalSection =
  | "overview"
  | "country"
  | "mobility"
  | "employers"
  | "sources";

export const fullCountries = ["Ireland", "Germany", "Netherlands"];
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
