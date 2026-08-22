import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

// Personio's own hosted XML, not user input, but still externally-fetched
// content this app doesn't control the size of - unlike the JSON feeds in
// this directory (JSON.parse is a well-understood, non-exponential cost
// regardless of size), this file scans with regex, so an unbounded response
// scales scan cost with input length for no bound. Matches the same
// length-cap discipline already applied to job-page.ts's location-signal
// scan for the identical reason. 5,000,000 characters is far beyond any
// realistic careers feed (hundreds of full job postings), so this only
// ever bites in a pathological case.
const MAX_XML_LENGTH = 5_000_000;

function text(node: string, tag: string): string {
  return node.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"))?.[1]?.trim() ?? "";
}
export class PersonioFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike; private readonly domain: "de" | "com";
  constructor(fetchImpl: FetchLike = fetch, domain: "de" | "com" = "de") { this.fetchImpl = fetchImpl; this.domain = domain; }
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://${encodeURIComponent(companySlug)}.jobs.personio.${this.domain}/xml`);
    if (!response.ok) throw new Error(`Personio feed failed (${response.status})`);
    const xml = (await response.text()).slice(0, MAX_XML_LENGTH);
    return [...xml.matchAll(/<position(?:\s[^>]*)?>([\s\S]*?)<\/position>/gi)].map((match) => {
      const node = match[1]; const id = text(node, "id");
      return { title: text(node, "name"), company: companySlug, location: text(node, "office"),
        url: text(node, "url") || `https://${companySlug}.jobs.personio.${this.domain}/job/${id}`,
        postedDate: text(node, "createdAt") || null, atsPlatform: "personio", descriptionRaw: text(node, "jobDescriptions"),
      } satisfies NormalisedJob;
    }).filter((job) => job.title && job.url);
  }
}
