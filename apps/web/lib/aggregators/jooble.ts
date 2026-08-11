import type { FetchLike, NormalisedJob } from "../ats-feeds/types";
export class JoobleFeed {
  private readonly apiKey: string; private readonly fetchImpl: FetchLike;
  constructor(apiKey: string, fetchImpl: FetchLike = fetch) { this.apiKey = apiKey; this.fetchImpl = fetchImpl; }
  async fetchJobs(keywords: string, location: string, page = 1): Promise<NormalisedJob[]> {
    if (!this.apiKey) throw new Error("Jooble API key is required");
    const response = await this.fetchImpl(`https://jooble.org/api/${encodeURIComponent(this.apiKey)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keywords, location, page }),
    });
    if (!response.ok) throw new Error(`Jooble feed failed (${response.status})`);
    const data = (await response.json()) as { jobs?: Array<Record<string, unknown>> };
    return (data.jobs ?? []).map((job) => ({ title: String(job.title ?? ""), company: String(job.company ?? ""),
      location: String(job.location ?? ""), url: String(job.link ?? ""), postedDate: typeof job.updated === "string" ? job.updated : null,
      atsPlatform: "unknown", descriptionRaw: String(job.snippet ?? ""),
    })).filter((job) => job.title && job.company && job.url);
  }
}
