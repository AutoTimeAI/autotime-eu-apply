// Client for a company's public Teamtailor jobs feed. The feed itself
// conforms to the open JSON Feed spec (jsonfeed.org) with a schema.org
// JobPosting extension per item, but Teamtailor doesn't officially document
// hosting it at this path - undocumented but stable, referenced by multiple
// independent sources. NOT the same as Teamtailor's official authenticated
// API (api.teamtailor.com), which needs a per-customer token AutoTime can't
// obtain generically. See the "Reverse-engineered feed exception" note in
// docs/reference/job-aggregation-compliance.md for why this is allowed here
// despite the general "published API only" rule for automated bulk ingestion.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type TeamtailorItem = {
  title?: string;
  url?: string;
  date_published?: string;
  content_html?: string;
  _jobposting?: {
    jobLocation?: Array<{ address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }>;
  };
};

/** Fetches and normalises open postings from a company's public Teamtailor jobs feed. */
export class TeamtailorFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Fetches all published postings for `companySlug`'s Teamtailor board and
   * maps them to NormalisedJob. Location is built from the first
   * `_jobposting.jobLocation` entry's address (city, then region or
   * country). Throws if the request fails. Items missing a title or url are
   * dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://${encodeURIComponent(companySlug)}.teamtailor.com/jobs.json`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Teamtailor feed failed (${response.status})`);
    const data = await response.json() as { items?: TeamtailorItem[] };
    return (data.items ?? []).map((job) => {
      const address = job._jobposting?.jobLocation?.[0]?.address;
      return {
        title: String(job.title ?? ""), company: companySlug,
        location: [address?.addressLocality, address?.addressRegion || address?.addressCountry].filter(Boolean).join(", "),
        url: String(job.url ?? ""),
        postedDate: typeof job.date_published === "string" ? job.date_published : null,
        atsPlatform: "teamtailor", descriptionRaw: String(job.content_html ?? ""),
      };
    }).filter((job) => job.title && job.url);
  }
}
