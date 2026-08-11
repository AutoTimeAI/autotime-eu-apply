import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

export class GreenhouseFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;
  constructor(fetchImpl: FetchLike = fetch) { this.fetchImpl = fetchImpl; }
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
