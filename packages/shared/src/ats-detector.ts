import { API_COVERED_ATS, PLATFORM_COVERAGE } from "./platform-coverage.ts";
export { API_COVERED_ATS } from "./platform-coverage.ts";
const ATS_PATTERNS = PLATFORM_COVERAGE.filter((item) => item.atsKey).flatMap((item) =>
  item.domains.map((domain) => ({ ats: item.atsKey!, domain })),
);
export function detectATS(jobUrl: string): string {
  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    return ATS_PATTERNS.find(({ domain }) => host === domain || host.endsWith(`.${domain}`))?.ats ?? "unknown";
  } catch { return "unknown"; }
}
function isOrIsSubdomainOf(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

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
