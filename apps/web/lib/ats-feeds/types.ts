// Shared contract for every per-company ATS feed client and job aggregator
// client in this directory and lib/aggregators/. Each provider (Ashby,
// Greenhouse, Lever, Personio, Recruitee, SmartRecruiters, Adzuna, Jooble)
// exposes a wildly different API shape; this file is the single normalised
// shape everything gets mapped into so the rest of the app never needs to
// know which provider a job came from.

/** A job listing normalised to a common shape regardless of source ATS/aggregator. */
export interface NormalisedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  postedDate: string | null;
  atsPlatform: string;
  descriptionRaw: string;
}

/** Contract implemented by each per-company ATS feed client (Ashby, Greenhouse, Lever, etc.). */
export interface ATSFeedFetcher {
  fetchJobs(companySlug: string): Promise<NormalisedJob[]>;
}

/** The `fetch` function type, injectable so feed clients can be tested without real network calls. */
export type FetchLike = typeof fetch;
