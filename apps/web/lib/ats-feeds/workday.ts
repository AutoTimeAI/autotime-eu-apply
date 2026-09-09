// Client for Workday's own CXS (career-site-experience) API - the same
// unauthenticated JSON endpoint a real Workday career site's own search box
// calls, discovered by capturing a real Workday site's own network requests
// (not from documentation - Workday doesn't publish this). Entirely
// separate from the account-gated application form that blocks autofill:
// job *listings* are public, only *applying* requires a Workday account.
// See the "Reverse-engineered feed exception" note in
// docs/reference/job-aggregation-compliance.md for why this is allowed
// here despite the general "published API only" rule for automated bulk
// ingestion.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type WorkdayJobPosting = {
  title?: string;
  externalPath?: string;
  locationsText?: string;
};

// Confirmed live: the CXS API rejects any limit above 20 with HTTP 400, so
// a large employer's postings must be paged. Capped at 25 pages (500
// postings) per company - defensive, not expected to bite for a normal
// employer, same discipline as the length caps on the regex-parsed feeds
// in this directory.
const PAGE_LIMIT = 20;
const MAX_PAGES = 25;

/** Fetches and normalises open postings from a Workday tenant's public CXS API. */
export class WorkdayFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * `companySlug` is `"{tenantHost}:{site}"` (e.g. `"ubc.wd10:ubcstaffjobs"`)
   * - Workday needs both the numbered tenant host (varies per company, not
   * guessable from the company name) and the site path segment, both read
   * directly off the company's real public careers URL
   * (`https://{tenantHost}.myworkdayjobs.com/{site}`) when configuring
   * `company_ats_slugs`. Paginates via `offset` until a page returns fewer
   * than `PAGE_LIMIT` postings (more robust than trusting `total`, which is
   * only populated on the first page's response - confirmed live). Throws
   * if the slug is malformed or any request fails. Postings missing a
   * title or externalPath are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const [tenantHost, site] = companySlug.split(":");
    if (!tenantHost || !site) throw new Error(`Workday company slug must be "tenantHost:site" (e.g. "ubc.wd10:ubcstaffjobs"), got "${companySlug}"`);
    const tenant = tenantHost.split(".")[0];
    const baseUrl = `https://${tenantHost}.myworkdayjobs.com`;
    const jobs: NormalisedJob[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const offset = page * PAGE_LIMIT;
      const response = await this.fetchImpl(`${baseUrl}/wday/cxs/${tenant}/${site}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appliedFacets: {}, limit: PAGE_LIMIT, offset, searchText: "" }),
      });
      if (!response.ok) throw new Error(`Workday feed failed (${response.status})`);
      const data = await response.json() as { jobPostings?: WorkdayJobPosting[] };
      const postings = data.jobPostings ?? [];
      if (postings.length === 0) break;

      for (const job of postings) {
        if (!job.title || !job.externalPath) continue;
        jobs.push({
          title: job.title, company: tenant, location: job.locationsText ?? "",
          url: `${baseUrl}/${site}${job.externalPath}`,
          postedDate: null, atsPlatform: "workday", descriptionRaw: "",
        });
      }
      if (postings.length < PAGE_LIMIT) break;
    }
    return jobs;
  }
}
