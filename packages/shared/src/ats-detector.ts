export const API_COVERED_ATS = [
  "greenhouse",
  "lever",
  "ashby",
  "personio",
] as const;
const ATS_PATTERNS: ReadonlyArray<{ ats: string; pattern: RegExp }> = [
  { ats: "greenhouse", pattern: /(?:boards|job-boards)\.greenhouse\.io/i },
  { ats: "lever", pattern: /jobs\.lever\.co/i },
  { ats: "workday", pattern: /myworkdayjobs\.com/i },
  { ats: "personio", pattern: /jobs\.personio\.(?:de|com)/i },
  { ats: "teamtailor", pattern: /teamtailor\.com/i },
  { ats: "recruitee", pattern: /recruitee\.com/i },
  { ats: "ashby", pattern: /jobs\.ashbyhq\.com/i },
  { ats: "smartrecruiters", pattern: /jobs\.smartrecruiters\.com/i },
  { ats: "workable", pattern: /apply\.workable\.com/i },
  { ats: "icims", pattern: /icims\.com/i },
  { ats: "successfactors", pattern: /successfactors\.(?:eu|com)/i },
];
export function detectATS(jobUrl: string): string {
  return (
    ATS_PATTERNS.find(({ pattern }) => pattern.test(jobUrl))?.ats ?? "unknown"
  );
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
