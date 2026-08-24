// Client for SmartRecruiters' public postings API. One of several
// per-company ATS feed clients in this directory that all implement
// ATSFeedFetcher and normalise their provider-specific response into
// NormalisedJob.
import type { ATSFeedFetcher, FetchLike, NormalisedJob } from "./types";

type SmartRecruitersPosting = {
  id?: string;
  name?: string;
  releasedDate?: string;
  refNumber?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  company?: { name?: string };
};

/** Fetches and normalises open postings from a company's SmartRecruiters job board. */
export class SmartRecruitersFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Fetches up to 100 public postings for `companySlug` from the SmartRecruiters
   * API and maps them to NormalisedJob. The list endpoint doesn't return full
   * posting bodies, so `descriptionRaw` is always left empty here (left for
   * downstream enrichment to fetch on demand) rather than guessed at. Throws
   * if the request fails. Postings missing a title or url are dropped.
   */
  async fetchJobs(companySlug: string): Promise<NormalisedJob[]> {
    const company = encodeURIComponent(companySlug);
    const response = await this.fetchImpl(
      `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100&destination=PUBLIC`,
    );
    if (!response.ok) {
      throw new Error(`SmartRecruiters feed failed (${response.status})`);
    }

    const data = (await response.json()) as {
      content?: SmartRecruitersPosting[];
    };

    return (data.content ?? [])
      .map((job) => ({
        title: String(job.name ?? ""),
        company: String(job.company?.name ?? companySlug),
        location: [job.location?.city, job.location?.region, job.location?.country]
          .filter(Boolean)
          .join(", "),
        url: job.id
          ? `https://jobs.smartrecruiters.com/${companySlug}/${encodeURIComponent(job.id)}`
          : "",
        postedDate: typeof job.releasedDate === "string" ? job.releasedDate : null,
        atsPlatform: "smartrecruiters",
        // List responses do not contain the full advert body. Downstream enrichment
        // can retrieve posting details without inventing or truncating content here.
        descriptionRaw: "",
      }))
      .filter((job) => job.title && job.url);
  }
}
