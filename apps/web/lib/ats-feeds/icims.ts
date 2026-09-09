// Client for a "Jibe-powered" iCIMS career site's own public jobs API - NOT
// universal across iCIMS. Confirmed live 2026-09-09 across 5 real employer
// career sites: 3 "classic" iCIMS portals (VHB, Applied Systems, Quest)
// render everything server-side with no separate jobs API at all, while 2
// modern Jibe-powered ones (UCI, iCIMS's own hrjobs.icims.com) run a
// client-rendered SPA backed by this real `/api/jobs` endpoint. A classic
// site hit with this same path returns HTTP 200 but its normal HTML page
// (SPA-style fallback routing, not a real 404) - `response.json()` throws a
// clear SyntaxError on that, which is the correct, honest "this company
// isn't Jibe-based" failure mode (surfaced in the sync report, not a silent
// zero-result). See the "Reverse-engineered feed exception" note in
// docs/reference/job-aggregation-compliance.md for why an undocumented
// endpoint is allowed here despite the general "published API only" rule.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type IcimsJobData = {
  title?: string;
  short_location?: string;
  posted_date?: string;
  meta_data?: { canonical_url?: string };
};
type IcimsJob = { data?: IcimsJobData };

// Confirmed live: this endpoint pages at 10 per response regardless of any
// requested page size, so a large employer needs multiple requests. Capped
// at 25 pages (250 postings) per company - same defensive discipline as
// workday.ts's page cap.
const PAGE_SIZE = 10;
const MAX_PAGES = 25;

/** Fetches and normalises open postings from a Jibe-powered iCIMS career site's public jobs API. */
export class IcimsFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * `companySlug` is the exact host of the company's real public careers
   * site - either a custom domain (`jobs.uci.edu`) or an `*.icims.com`
   * subdomain (`hrjobs.icims.com`); both host this same API directly when
   * the deployment is Jibe-powered. Throws (a JSON parse error, by design -
   * see the file header) if the host isn't actually Jibe-powered, or if any
   * request fails. Postings missing a title or canonical url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const jobs: NormalisedJob[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await this.fetchImpl(`https://${companySlug}/api/jobs?page=${page}&sortBy=relevance&descending=false&internal=false`);
      if (!response.ok) throw new Error(`iCIMS feed failed (${response.status})`);
      const data = await response.json() as { jobs?: IcimsJob[] };
      const postings = data.jobs ?? [];
      if (postings.length === 0) break;

      for (const entry of postings) {
        const job = entry.data ?? {};
        const url = job.meta_data?.canonical_url ?? "";
        if (!job.title || !url) continue;
        jobs.push({
          title: job.title, company: companySlug, location: job.short_location ?? "",
          url, postedDate: typeof job.posted_date === "string" ? job.posted_date : null,
          atsPlatform: "icims", descriptionRaw: "",
        });
      }
      if (postings.length < PAGE_SIZE) break;
    }
    return jobs;
  }
}
