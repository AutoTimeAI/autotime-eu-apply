// Client for Recruitee's public offers API. One of several per-company ATS
// feed clients in this directory that all implement ATSFeedFetcher and
// normalise their provider-specific response into NormalisedJob.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type RecruiteeOffer = {
  title?: string;
  description?: string;
  careers_url?: string;
  careers_apply_url?: string;
  created_at?: string;
  city?: string;
  country?: string;
  locations?: Array<{ city?: string; country?: string }>;
};

/** Fetches and normalises open postings from a company's Recruitee job board. */
export class RecruiteeFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Fetches all offers for `companySlug`'s Recruitee board and maps them to
   * NormalisedJob. Location is built from the offer's own city/country fields,
   * falling back to its first `locations` entry. Throws if the request fails.
   * Offers missing a title or url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const response = await this.fetchImpl(`https://${encodeURIComponent(companySlug)}.recruitee.com/api/offers/`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Recruitee feed failed (${response.status})`);
    const data = await response.json() as { offers?: RecruiteeOffer[] };
    return (data.offers ?? []).map((job) => {
      const location = job.locations?.[0];
      return {
        title: String(job.title ?? ""), company: companySlug,
        location: [job.city ?? location?.city, job.country ?? location?.country].filter(Boolean).join(", "),
        url: String(job.careers_url ?? job.careers_apply_url ?? ""),
        postedDate: typeof job.created_at === "string" ? job.created_at : null,
        atsPlatform: "recruitee", descriptionRaw: String(job.description ?? ""),
      };
    }).filter((job) => job.title && job.url);
  }
}
