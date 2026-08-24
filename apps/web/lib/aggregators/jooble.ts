// Client for the Jooble job search aggregator API. Like the Adzuna client
// in this directory, Jooble aggregates listings from many sources rather
// than one employer's board, so results are normalised to the shared
// NormalisedJob shape but tagged atsPlatform: "unknown".
import type { FetchLike, NormalisedJob } from "../ats-feeds/types";

/** Fetches and normalises job search results from the Jooble API for given keywords/location. */
export class JoobleFeed {
  private readonly apiKey: string; private readonly fetchImpl: FetchLike;
  constructor(apiKey: string, fetchImpl: FetchLike = fetch) { this.apiKey = apiKey; this.fetchImpl = fetchImpl; }
  /**
   * Fetches one page of Jooble search results for `keywords`/`location` and maps
   * them to NormalisedJob. Jooble's API is POST-based (unlike the GET-based feeds
   * elsewhere in this directory). Throws if the API key is missing or the request
   * fails. Results missing a title, company, or url are dropped.
   */
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
