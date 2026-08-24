// Client for Lever's public postings API. One of several per-company ATS
// feed clients in this directory that all implement ATSFeedFetcher and
// normalise their provider-specific response into NormalisedJob.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

/** Fetches and normalises open postings from a company's Lever job board. */
export class LeverFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike = fetch) { this.fetchImpl = fetchImpl; }
  /**
   * Fetches all postings for `companySlug`'s Lever board and maps them to
   * NormalisedJob. Lever's `createdAt` is a numeric epoch timestamp, converted
   * here to an ISO string. Throws if the request fails. Postings missing a
   * title or url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}?mode=json`);
    if (!response.ok) throw new Error(`Lever feed failed (${response.status})`);
    const data = (await response.json()) as Array<Record<string, unknown>>;
    return data.map((job) => ({ title: String(job.text ?? ""), company: companySlug,
      location: String((job.categories as { location?: unknown } | undefined)?.location ?? ""),
      url: String(job.hostedUrl ?? job.applyUrl ?? ""), postedDate: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : null,
      atsPlatform: "lever", descriptionRaw: String(job.descriptionPlain ?? job.description ?? ""),
    })).filter((job) => job.title && job.url);
  }
}
