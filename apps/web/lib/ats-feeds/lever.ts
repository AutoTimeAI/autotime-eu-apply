import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";
export class LeverFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike = fetch) { this.fetchImpl = fetchImpl; }
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
