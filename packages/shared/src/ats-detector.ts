// Derives ATS identity and "can we call a real API for this job" status from
// a job URL's hostname, built on top of the platform coverage table in
// platform-coverage.ts. Used by both apps to decide whether an application
// can be auto-filled/tracked via a known ATS integration (Greenhouse, Lever,
// etc.) versus needing generic/manual handling - see
// apps/web/lib/ats-detector.ts and apps/extension/lib/job-page.ts.
import { API_COVERED_ATS, PLATFORM_COVERAGE } from "./platform-coverage.ts";
export { API_COVERED_ATS } from "./platform-coverage.ts";
const ATS_PATTERNS = PLATFORM_COVERAGE.filter((item) => item.atsKey).flatMap((item) =>
  item.domains.map((domain) => ({ ats: item.atsKey!, domain })),
);
/**
 * Identifies which ATS hosts a job posting by matching the URL's hostname
 * (exact or subdomain) against platform-coverage.ts's known ATS domains.
 * Returns "unknown" for an unrecognised host or an unparsable URL.
 */
export function detectATS(jobUrl: string): string {
  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    return ATS_PATTERNS.find(({ domain }) => host === domain || host.endsWith(`.${domain}`))?.ats ?? "unknown";
  } catch { return "unknown"; }
}
function isOrIsSubdomainOf(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Whether a job URL can be enriched/verified through a real API rather than
 * page scraping - true for ATS platforms in API_COVERED_ATS (verified
 * native-feed ATSes) plus a short allowlist of job-board APIs (EURES,
 * Adzuna, Jooble) that aren't ATS-keyed. Domain checks require an exact host
 * match or a dot-bounded subdomain (see isOrIsSubdomainOf) to avoid a
 * look-alike domain like "fake-adzuna.com" being treated as covered.
 */
export function isApiCoveredJobUrl(jobUrl: string): boolean {
  const ats = detectATS(jobUrl);
  if ((API_COVERED_ATS as readonly string[]).includes(ats)) return true;
  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    // A bare host.endsWith("adzuna.com") also matches "fake-adzuna.com" - a
    // real, freely registrable domain with no relation to Adzuna - since
    // endsWith has no concept of a label/dot boundary. Require the domain
    // to be the exact host or preceded by a dot, matching detectATS's own
    // correct pattern above.
    return (
      isOrIsSubdomainOf(host, "eures.europa.eu") ||
      isOrIsSubdomainOf(host, "eures.ec.europa.eu") ||
      isOrIsSubdomainOf(host, "adzuna.com") ||
      isOrIsSubdomainOf(host, "jooble.org")
    );
  } catch {
    return false;
  }
}
