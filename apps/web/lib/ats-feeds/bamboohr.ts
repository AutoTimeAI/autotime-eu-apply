// Client for BambooHR's public careers list. Undocumented but stable (the
// endpoint is unauthenticated and its shape is referenced by multiple
// independent third-party tools) - see the "Reverse-engineered feed
// exception" note in docs/reference/job-aggregation-compliance.md for why
// this is allowed here despite the general "published API only" rule for
// automated bulk ingestion.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type BambooHRJob = {
  id?: string | number;
  jobOpeningName?: string;
  location?: { city?: string; state?: string };
};

/** Fetches and normalises open postings from a company's public BambooHR careers list. */
export class BambooHRFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Fetches all open postings for `companySlug`'s BambooHR careers list and
   * maps them to NormalisedJob. The list endpoint carries no per-job
   * description or posted date (only /careers/{id}/detail would, and this
   * client deliberately doesn't make a second request per job - same
   * one-request-per-company shape as the other feeds here). Throws if the
   * request fails. Jobs missing a title or id (no derivable url) are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/list`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`BambooHR feed failed (${response.status})`);
    const data = await response.json() as { result?: BambooHRJob[] };
    return (data.result ?? []).map((job) => ({
      title: String(job.jobOpeningName ?? ""), company: companySlug,
      location: [job.location?.city, job.location?.state].filter(Boolean).join(", "),
      url: job.id != null ? `https://${companySlug}.bamboohr.com/careers/${job.id}` : "",
      postedDate: null, atsPlatform: "bamboohr", descriptionRaw: "",
    })).filter((job) => job.title && job.url);
  }
}
