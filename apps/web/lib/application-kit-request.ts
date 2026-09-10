/**
 * Maps the live jobs workspace's own data shapes (JobRecord, the cloud
 * profile row, MobilityProfile) onto the request body `/api/ai/content`
 * actually expects (CandidateProfile/JobAnalysisDraft/ReusableAnswers from
 * packages/shared/src/schemas.ts). That route - and the AI kit-generation
 * pipeline behind it (prepareApplicationKit, assessApplicationDecision) -
 * already exists and is exercised from the browser extension; this reuses
 * it rather than building a second generation path, so
 * JobApplicationWorkspace gains AI-drafted application content without any
 * new backend surface. Every field is sourced from real, already-collected
 * evidence or left as an honest empty string - never inferred or invented.
 */
import type { JobRecord } from "./job-application-workflow";
import type { CandidateProfile, JobAnalysisDraft, MobilityProfile } from "shared";

/** The subset of the `/api/profile/onboarding` GET response this mapper reads. */
export type OnboardingProfileFields = {
  base_cv_text?: string | null;
  countries_target?: string[] | null;
  country_current?: string | null;
  email?: string | null;
  experience_highlights?: string | null;
  full_name?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  portfolio_url?: string | null;
  project_summaries?: string | null;
  target_roles?: string | null;
  work_authorisation_category?: string | null;
  work_right_details?: string | null;
};

function mapWorkMode(value: string): JobAnalysisDraft["workMode"] {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("onsite") || normalized.includes("on-site") || normalized.includes("office"))
    return "onsite";
  return "unknown";
}

function formatSalary(profile: MobilityProfile): string {
  const money = profile.preferredSalary ?? profile.minimumSalary;
  return money ? `${money.amount} ${money.currency}/${money.period}` : "";
}

export function buildApplicationKitRequest({
  job,
  profile,
  mobilityProfile,
}: {
  job: JobRecord;
  profile: OnboardingProfileFields;
  mobilityProfile: MobilityProfile;
}): {
  profile: CandidateProfile;
  job: JobAnalysisDraft;
  reusableAnswers: null;
} {
  return {
    profile: {
      fullName: profile.full_name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      linkedInUrl: profile.linkedin_url ?? "",
      githubUrl: profile.github_url ?? "",
      portfolioUrl: profile.portfolio_url ?? "",
      currentCountry: profile.country_current ?? "",
      currentCity: "",
      targetCountries: (profile.countries_target ?? []).join(", "),
      targetRoles: profile.target_roles ?? "",
      workRightDetails: profile.work_right_details ?? "",
      sponsorshipNeeded: profile.work_authorisation_category === "sponsorship_required",
      relocationWillingness: mobilityProfile.relocationPreference,
      salaryExpectation: formatSalary(mobilityProfile),
      noticePeriod: mobilityProfile.noticePeriod ?? "",
      baseCvText: profile.base_cv_text ?? "",
      projectSummaries: profile.project_summaries ?? "",
      experienceHighlights: profile.experience_highlights ?? "",
    },
    job: {
      jobTitle: job.title.value,
      company: job.employer.value,
      jobUrl: job.sourceUrl,
      location: job.facts.location.value || job.facts.country.value,
      workMode: mapWorkMode(job.facts.workArrangement.value),
      jobDescription: job.description,
      notes: "",
    },
    reusableAnswers: null,
  };
}
