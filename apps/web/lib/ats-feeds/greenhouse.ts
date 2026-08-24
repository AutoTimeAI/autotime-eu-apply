// Client for Greenhouse's public job-board API. One of several per-company
// ATS feed clients in this directory that all implement ATSFeedFetcher and
// normalise their provider-specific response into NormalisedJob.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

/** Fetches and normalises open postings from a company's Greenhouse job board. */
export class GreenhouseFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike = fetch) { this.fetchImpl = fetchImpl; }
  /**
   * Fetches all postings for `companySlug`'s Greenhouse board (requesting
   * `content=true` so the full HTML job description comes back) and maps them
   * to NormalisedJob. Throws if the request fails. Postings missing a title or
   * url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companySlug)}/jobs?content=true`);
    if (!response.ok) throw new Error(`Greenhouse feed failed (${response.status})`);
    const data = (await response.json()) as { jobs?: Array<Record<string, unknown>> };
    return (data.jobs ?? []).map((job) => ({
      title: String(job.title ?? ""), company: companySlug,
      location: String((job.location as { name?: unknown } | undefined)?.name ?? ""),
      url: String(job.absolute_url ?? ""), postedDate: typeof job.updated_at === "string" ? job.updated_at : null,
      atsPlatform: "greenhouse", descriptionRaw: String(job.content ?? ""),
    })).filter((job) => job.title && job.url);
  }
}
