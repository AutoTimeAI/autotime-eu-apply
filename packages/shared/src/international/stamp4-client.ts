// Stamp4's sponsorship-check engine (the real statutory-threshold,
// occupation-mapped legal-eligibility check that exists for UK/Ireland/
// Netherlands/Germany) now runs in-process via sponsorship-readiness.ts's
// assessSponsorshipReadiness, composed into assessInternationalJob's
// evidence via InternationalAssessmentInput's optional stamp4Assessment
// field rather than replacing AutoTime's own broader text-signal engine.
//
// This file used to also export an HTTP client (fetchStamp4SponsorshipAssessment)
// that called the original standalone Stamp4 microservice over the network
// with a shared bearer secret, kept temporarily for shadow comparisons
// during the in-process migration. Removed 2026-09-17: zero callers
// existed anywhere in the codebase, no STAMP4_SPONSORSHIP_SERVICE_URL/
// STAMP4_SPONSORSHIP_SERVICE_SECRET env vars were ever configured for it,
// and the standalone deployment itself no longer exists - retaining an
// unused, network-calling, secret-bearing code path with no caller was a
// real if latent attack-surface and maintenance cost with zero benefit.
// Only this coverage check survives, since it's still live-called from
// decision-adapter.ts and the /api/international/stamp4-check route.

const STAMP4_SPONSORSHIP_COUNTRY_IDS = new Set(["uk", "ireland", "netherlands", "germany"]);

/** Whether `countryPackId` (a CountryPack.id from getInternationalCountryPack) is one Stamp4 has real legal-threshold data for - AutoTime's own text-signal engine stays the sole authority everywhere else (France, the generic European-explorer countries). */
export function isStamp4SponsorshipCovered(countryPackId: string): boolean {
  return STAMP4_SPONSORSHIP_COUNTRY_IDS.has(countryPackId);
}
