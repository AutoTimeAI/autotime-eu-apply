import type { FetchLike, NormalisedJob } from "../ats-feeds/types";
export class AdzunaFeed {
  private readonly appId: string; private readonly appKey: string; private readonly fetchImpl: FetchLike;
  constructor(appId: string, appKey: string, fetchImpl: FetchLike = fetch) { this.appId = appId; this.appKey = appKey; this.fetchImpl = fetchImpl; }
  async fetchJobs(country: string, query: string, page = 1): Promise<NormalisedJob[]> {
    if (!this.appId || !this.appKey) throw new Error("Adzuna credentials are required");
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${page}`);
    url.search = new URLSearchParams({ app_id: this.appId, app_key: this.appKey, what: query, results_per_page: "50" }).toString();
    const response = await this.fetchImpl(url); if (!response.ok) throw new Error(`Adzuna feed failed (${response.status})`);
    const data = (await response.json()) as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).map((job) => ({ title: String(job.title ?? ""),
      company: String((job.company as { display_name?: unknown } | undefined)?.display_name ?? ""),
      location: String((job.location as { display_name?: unknown } | undefined)?.display_name ?? ""),
      url: String(job.redirect_url ?? ""), postedDate: typeof job.created === "string" ? job.created : null,
      atsPlatform: "unknown", descriptionRaw: String(job.description ?? ""),
    })).filter((job) => job.title && job.company && job.url);
  }
}
