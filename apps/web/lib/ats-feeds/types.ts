export interface NormalisedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate: string | null;
  atsPlatform: string;
  descriptionRaw: string;
}

export interface ATSFeedFetcher {
  fetchJobs(companySlug: string): Promise<NormalisedJob[]>;
}

export type FetchLike = typeof fetch;
