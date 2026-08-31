// Hand-maintained, honesty-first registry of every job board / ATS / network
// AutoTime claims to support, and exactly what "support" means for each one
// (capture, autofill, native-feed status) plus a public-facing limitation
// string. This is the source of truth behind ats-detector.ts's ATS/API
// detection and the public coverage disclosures shown in the web app (e.g.
// apps/web/lib/coverage-report.ts, apps/web/app/admin/market-data). Keep
// `PLATFORM_NAMES`/`domains`/status fields in sync with reality - this table
// is read as a factual claim, not aspirational status.
export const COVERAGE_STATUSES = [
  "verified", "partial", "manual_only", "unsupported", "unverified", "not_applicable",
] as const;

export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];
export type PlatformCategory = "job_board" | "ats" | "professional_network";
export type PlatformCaptureMode = "api-reference" | "selector-extraction" | "manual-only";

export const PLATFORM_NAMES = [
  "LinkedIn", "Stepstone", "Indeed", "EURES", "EuroTechJobs", "EuroJobs",
  "NextLevelJobs", "Wellfound", "Xing", "WelcomeToTheJungle",
  "NationaleVacaturebank", "InfoJobs", "Monster", "EuroTopTech", "JobTeaser",
  "Greenhouse", "Lever", "Workday", "Ashby", "SmartRecruiters", "iCIMS",
  "BambooHR", "Teamtailor", "Recruitee", "Jobvite", "Personio",
] as const;

export type PlatformName = (typeof PLATFORM_NAMES)[number];

/** One row of the coverage table: what a platform is, and the truthful, per-capability status of AutoTime's support for it. */
export type PlatformCoverage = {
  platform: PlatformName;
  slug: string;
  category: PlatformCategory;
  domains: readonly string[];
  atsKey?: string;
  expectedCaptureMode: PlatformCaptureMode;
  capture: CoverageStatus;
  autofill: CoverageStatus;
  nativeFeed: CoverageStatus;
  lastVerifiedAt: string;
  fixture: string;
  liveCheckUrl: string;
  publicLimitation: string;
};

const VERIFIED_AT = "2026-08-18";
const fixture = (slug: string) => `coverage/${slug}.html`;

export const PLATFORM_COVERAGE: readonly PlatformCoverage[] = [
  { platform:"LinkedIn",slug:"linkedin",category:"professional_network",domains:["linkedin.com"],expectedCaptureMode:"manual-only",capture:"manual_only",autofill:"manual_only",nativeFeed:"not_applicable",lastVerifiedAt:"2026-08-31",fixture:fixture("linkedin"),liveCheckUrl:"https://www.linkedin.com/jobs/",publicLimitation:"Manual copy/paste only; AutoTime does not scrape or automate LinkedIn." },
  { platform:"Stepstone",slug:"stepstone",category:"job_board",domains:["stepstone.de","stepstone.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:VERIFIED_AT,fixture:fixture("stepstone"),liveCheckUrl:"https://www.stepstone.de/jobs",publicLimitation:"Job capture uses visible page data; applications may redirect to another ATS." },
  { platform:"Indeed",slug:"indeed",category:"job_board",domains:["indeed.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:VERIFIED_AT,fixture:fixture("indeed"),liveCheckUrl:"https://www.indeed.com/",publicLimitation:"Generic capture and reviewed field filling; page variants can require manual correction." },
  { platform:"EURES",slug:"eures",category:"job_board",domains:["eures.europa.eu","eures.ec.europa.eu"],expectedCaptureMode:"api-reference",capture:"partial",autofill:"not_applicable",nativeFeed:"partial",lastVerifiedAt:"2026-08-31",fixture:fixture("eures"),liveCheckUrl:"https://eures.europa.eu/index_en",publicLimitation:"Captures public vacancy references; application handling depends on the originating service." },
  { platform:"EuroTechJobs",slug:"eurotechjobs",category:"job_board",domains:["eurotechjobs.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("eurotechjobs"),liveCheckUrl:"https://www.eurotechjobs.com/",publicLimitation:"Visible job details only; external application flows vary." },
  { platform:"EuroJobs",slug:"eurojobs",category:"job_board",domains:["eurojobs.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("eurojobs"),liveCheckUrl:"https://eurojobs.com/",publicLimitation:"Visible job details only; external application flows vary." },
  { platform:"NextLevelJobs",slug:"nextleveljobs",category:"job_board",domains:["nextleveljobs.eu"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("nextleveljobs"),liveCheckUrl:"https://nextleveljobs.eu/",publicLimitation:"Visible job details only; external application flows vary." },
  { platform:"Wellfound",slug:"wellfound",category:"job_board",domains:["wellfound.com","angel.co"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("wellfound"),liveCheckUrl:"https://wellfound.com/jobs",publicLimitation:"Reviewed generic capture and field filling; sign-in-only flows are not live-tested." },
  { platform:"Xing",slug:"xing",category:"professional_network",domains:["xing.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("xing"),liveCheckUrl:"https://www.xing.com/jobs",publicLimitation:"Public job details only; profile and messaging automation are excluded." },
  { platform:"WelcomeToTheJungle",slug:"welcome-to-the-jungle",category:"job_board",domains:["welcometothejungle.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("welcome-to-the-jungle"),liveCheckUrl:"https://www.welcometothejungle.com/en/jobs",publicLimitation:"Visible job details only; external application flows vary." },
  { platform:"NationaleVacaturebank",slug:"nationale-vacaturebank",category:"job_board",domains:["nationalevacaturebank.nl"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("nationale-vacaturebank"),liveCheckUrl:"https://www.nationalevacaturebank.nl/",publicLimitation:"Visible vacancy capture; Dutch page variants may require manual correction." },
  { platform:"InfoJobs",slug:"infojobs",category:"job_board",domains:["infojobs.net","infojobs.it"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:VERIFIED_AT,fixture:fixture("infojobs"),liveCheckUrl:"https://www.infojobs.net/",publicLimitation:"Generic capture and reviewed field filling; authenticated flows are not live-tested." },
  { platform:"Monster",slug:"monster",category:"job_board",domains:["monster.com","monster.co.uk","monster.de","monster.fr"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:VERIFIED_AT,fixture:fixture("monster"),liveCheckUrl:"https://www.monster.co.uk/jobs/",publicLimitation:"Generic capture and reviewed field filling; regional page variants differ." },
  { platform:"EuroTopTech",slug:"eurotoptech",category:"job_board",domains:["eurotoptech.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("eurotoptech"),liveCheckUrl:"https://eurotoptech.com/",publicLimitation:"Visible job details only; external application flows vary." },
  { platform:"JobTeaser",slug:"jobteaser",category:"job_board",domains:["jobteaser.com"],expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"not_applicable",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("jobteaser"),liveCheckUrl:"https://www.jobteaser.com/",publicLimitation:"Public job capture only; institution and sign-in-only flows are excluded." },
  { platform:"Greenhouse",slug:"greenhouse",category:"ats",domains:["boards.greenhouse.io","job-boards.greenhouse.io"],atsKey:"greenhouse",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("greenhouse"),liveCheckUrl:"https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true",publicLimitation:"Native public feed and reviewed field filling; custom employer forms can differ." },
  { platform:"Lever",slug:"lever",category:"ats",domains:["jobs.lever.co"],atsKey:"lever",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("lever"),liveCheckUrl:"https://api.lever.co/v0/postings/palantir?mode=json",publicLimitation:"Native public feed and reviewed field filling; custom questions remain manual." },
  { platform:"Workday",slug:"workday",category:"ats",domains:["myworkdayjobs.com"],atsKey:"workday",expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("workday"),liveCheckUrl:"https://workday.wd5.myworkdayjobs.com/Workday",publicLimitation:"Tenant-specific pages are captured heuristically; multi-step forms require review." },
  { platform:"Ashby",slug:"ashby",category:"ats",domains:["jobs.ashbyhq.com"],atsKey:"ashby",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("ashby"),liveCheckUrl:"https://api.ashbyhq.com/posting-api/job-board/ashby",publicLimitation:"Native public feed and reviewed field filling; custom questions remain manual." },
  { platform:"SmartRecruiters",slug:"smartrecruiters",category:"ats",domains:["jobs.smartrecruiters.com"],atsKey:"smartrecruiters",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("smartrecruiters"),liveCheckUrl:"https://api.smartrecruiters.com/v1/companies/SmartRecruiters/postings?limit=10&destination=PUBLIC",publicLimitation:"Native public feed metadata; full advert enrichment and custom questions may require review." },
  { platform:"iCIMS",slug:"icims",category:"ats",domains:["icims.com"],atsKey:"icims",expectedCaptureMode:"selector-extraction",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:VERIFIED_AT,fixture:fixture("icims"),liveCheckUrl:"https://careers.icims.com/",publicLimitation:"Tenant-specific capture and reviewed field filling; layouts vary materially." },
  { platform:"BambooHR",slug:"bamboohr",category:"ats",domains:["bamboohr.com"],atsKey:"bamboohr",expectedCaptureMode:"manual-only",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("bamboohr"),liveCheckUrl:"https://bamboohr.com/careers",publicLimitation:"Generic capture and reviewed field filling; no native feed integration." },
  { platform:"Teamtailor",slug:"teamtailor",category:"ats",domains:["teamtailor.com"],atsKey:"teamtailor",expectedCaptureMode:"manual-only",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("teamtailor"),liveCheckUrl:"https://career.teamtailor.com/",publicLimitation:"Generic capture and reviewed field filling; no native feed integration." },
  { platform:"Recruitee",slug:"recruitee",category:"ats",domains:["recruitee.com"],atsKey:"recruitee",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("recruitee"),liveCheckUrl:"https://trustedshops.recruitee.com/api/offers/",publicLimitation:"Native public careers feed and reviewed field filling; custom questions remain manual." },
  { platform:"Jobvite",slug:"jobvite",category:"ats",domains:["jobvite.com"],atsKey:"jobvite",expectedCaptureMode:"manual-only",capture:"partial",autofill:"partial",nativeFeed:"unsupported",lastVerifiedAt:"2026-08-31",fixture:fixture("jobvite"),liveCheckUrl:"https://jobs.jobvite.com/",publicLimitation:"Generic capture and reviewed field filling; no native feed integration." },
  { platform:"Personio",slug:"personio",category:"ats",domains:["jobs.personio.de","jobs.personio.com"],atsKey:"personio",expectedCaptureMode:"api-reference",capture:"verified",autofill:"partial",nativeFeed:"verified",lastVerifiedAt:"2026-08-31",fixture:fixture("personio"),liveCheckUrl:"https://personio.jobs.personio.de/xml",publicLimitation:"Native public feed and reviewed field filling; employer-specific forms can differ." },
] as const;

/** ATS keys (e.g. "greenhouse", "lever") with a verified native public feed - the platforms ats-detector.ts treats as API-covered. */
export const API_COVERED_ATS = PLATFORM_COVERAGE
  .filter((item) => item.category === "ats" && item.nativeFeed === "verified")
  .map((item) => item.atsKey!) as readonly string[];

/** Identifies which known platform a job URL belongs to by hostname (exact or subdomain match, "www." stripped); null if unrecognised. */
export function getCoveragePlatform(jobUrl: string): PlatformName | null {
  try {
    const hostname = new URL(jobUrl).hostname.toLowerCase().replace(/^www\./, "");
    return PLATFORM_COVERAGE.find((item) =>
      item.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)),
    )?.platform ?? null;
  } catch { return null; }
}

/** True once a `lastVerifiedAt` date (YYYY-MM-DD) is more than `days` old (default 30) - or if it can't be parsed at all, which is treated as stale. */
export function isCoverageStale(lastVerifiedAt: string, now = new Date(), days = 30) {
  const verified = new Date(`${lastVerifiedAt}T00:00:00.000Z`).getTime();
  return !Number.isFinite(verified) || now.getTime() - verified > days * 86_400_000;
}

/** Aggregate counts (platforms tracked, still-current entries, verified capture/native-feed counts) for the public coverage disclosure page. */
export function getPublicCoverageSummary(now = new Date()) {
  const current = PLATFORM_COVERAGE.filter((item) => !isCoverageStale(item.lastVerifiedAt, now));
  return {
    platforms: PLATFORM_COVERAGE.length,
    currentPlatforms: current.length,
    captureVerified: current.filter((item) => item.capture === "verified").length,
    nativeFeeds: current.filter((item) => item.nativeFeed === "verified").length,
  };
}
