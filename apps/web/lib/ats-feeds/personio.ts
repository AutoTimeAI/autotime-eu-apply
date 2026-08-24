/** Normalises a company's public Personio XML feed into the shared job shape. */
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

function text(node: string, tag: string): string {
  return node.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"))?.[1]?.trim() ?? "";
}
/** Fetches Personio postings from either supported regional feed domain. */
export class PersonioFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike; private readonly domain: "de" | "com";
  constructor(fetchImpl: FetchLike = fetch, domain: "de" | "com" = "de") { this.fetchImpl = fetchImpl; this.domain = domain; }
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://${encodeURIComponent(companySlug)}.jobs.personio.${this.domain}/xml`);
    if (!response.ok) throw new Error(`Personio feed failed (${response.status})`);
    const xml = await response.text();
    return [...xml.matchAll(/<position(?:\s[^>]*)?>([\s\S]*?)<\/position>/gi)].map((match) => {
      const node = match[1]; const id = text(node, "id");
      return { title: text(node, "name"), company: companySlug, location: text(node, "office"),
        url: text(node, "url") || `https://${companySlug}.jobs.personio.${this.domain}/job/${id}`,
        postedDate: text(node, "createdAt") || null, atsPlatform: "personio", descriptionRaw: text(node, "jobDescriptions"),
      } satisfies NormalisedJob;
    }).filter((job) => job.title && job.url);
  }
}
