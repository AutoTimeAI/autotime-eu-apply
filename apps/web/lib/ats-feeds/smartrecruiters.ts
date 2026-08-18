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

export class SmartRecruitersFeed implements ATSFeedFetcher {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.fetchImpl = fetchImpl;
  }

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
