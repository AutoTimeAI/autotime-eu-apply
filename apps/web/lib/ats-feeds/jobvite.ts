// Client for a company's public Jobvite job feed. Jobvite's older
// `api/company/{slug}/jobs` JSON endpoint is dead (confirmed via a dated
// third-party migration note); the working path is XML at
// app.jobvite.com/CompanyJobs/Xml.aspx, keyed by an opaque `companyEId` -
// NOT the same as the public careers-page slug. That id is embedded
// directly in the public careers page's own HTML/JS
// (`companyEId: '<id>'`), so this client does a two-step fetch: read the
// careers page to discover the id, then fetch the real feed with it.
// Confirmed live against 2 real employers (2026-09-08).
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

// Same length-cap discipline as personio.ts and for the same reason: this
// file scans externally-fetched content with regex (not JSON.parse), so an
// unbounded response would scale scan cost with input length for no bound.
// The careers page is a simple listing page (far smaller than a full XML
// feed); the XML feed cap matches personio.ts's, since Jobvite's own feed
// is the same kind of "every open posting in one response" shape.
const MAX_CAREERS_PAGE_LENGTH = 2_000_000;
const MAX_XML_LENGTH = 5_000_000;

function text(node: string, tag: string): string {
  return node.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"))?.[1]?.trim() ?? "";
}

/** Fetches and normalises open postings from a company's public Jobvite job feed. */
export class JobviteFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Discovers `companySlug`'s opaque companyEId from its public careers page,
   * then fetches and normalises its Jobvite XML feed. Throws if either
   * request fails or no companyEId is found on the careers page. Jobs
   * missing a title or detail-url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const careersPageResponse = await this.fetchImpl(`https://jobs.jobvite.com/${encodeURIComponent(companySlug)}/jobs`);
    if (!careersPageResponse.ok) throw new Error(`Jobvite careers page failed (${careersPageResponse.status})`);
    const careersPageHtml = (await careersPageResponse.text()).slice(0, MAX_CAREERS_PAGE_LENGTH);
    const companyEId = careersPageHtml.match(/companyEId:\s*'([^']+)'/)?.[1];
    if (!companyEId) throw new Error(`Jobvite careers page for ${companySlug} has no discoverable companyEId`);

    const feedResponse = await this.fetchImpl(`https://app.jobvite.com/CompanyJobs/Xml.aspx?c=${encodeURIComponent(companyEId)}`);
    if (!feedResponse.ok) throw new Error(`Jobvite feed failed (${feedResponse.status})`);
    const xml = (await feedResponse.text()).slice(0, MAX_XML_LENGTH);
    return [...xml.matchAll(/<job>([\s\S]*?)<\/job>/gi)].map((match) => {
      const node = match[1];
      return {
        title: text(node, "title"), company: companySlug, location: text(node, "location"),
        url: text(node, "detail-url"), postedDate: text(node, "date") || null,
        atsPlatform: "jobvite", descriptionRaw: text(node, "description"),
      } satisfies NormalisedJob;
    }).filter((job) => job.title && job.url);
  }
}
