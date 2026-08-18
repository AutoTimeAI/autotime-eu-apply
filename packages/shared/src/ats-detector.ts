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
export function isApiCoveredJobUrl(jobUrl: string): boolean {
  const ats = detectATS(jobUrl);
  if ((API_COVERED_ATS as readonly string[]).includes(ats)) return true;
  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    return (
      host.endsWith("eures.europa.eu") ||
      host.endsWith("eures.ec.europa.eu") ||
      host.endsWith("adzuna.com") ||
      host.endsWith("jooble.org")
    );
  } catch {
    return false;
  }
}
