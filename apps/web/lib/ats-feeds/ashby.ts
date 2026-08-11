import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";
export class AshbyFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike = fetch) { this.fetchImpl = fetchImpl; }
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}`);
    if (!response.ok) throw new Error(`Ashby feed failed (${response.status})`);
    const data = (await response.json()) as { jobs?: Array<Record<string, unknown>> };
    return (data.jobs ?? []).map((job) => ({ title: String(job.title ?? ""), company: companySlug,
      location: String(job.location ?? ""), url: String(job.jobUrl ?? job.applyUrl ?? ""),
      postedDate: typeof job.publishedAt === "string" ? job.publishedAt : null, atsPlatform: "ashby",
      descriptionRaw: String(job.descriptionPlain ?? job.descriptionHtml ?? ""),
    })).filter((job) => job.title && job.url);
  }
}
