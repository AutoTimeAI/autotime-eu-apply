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

export class RecruiteeFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

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
