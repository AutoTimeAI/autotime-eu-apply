import {
  companionDashboardStateSchema,
  type CandidateProfile,
  type CompanionDashboardState,
  type JobAnalysisDraft,
  type ReusableAnswers,
} from "shared";

export const dashboardStorageKey = "autotime-v2-companion-dashboard";
export const profileProtocolReadinessEvent = "autotime-profile-readiness-updated";

export const emptyProfile: CandidateProfile = {
  fullName: "", email: "", phone: "", linkedInUrl: "", githubUrl: "",
  portfolioUrl: "", currentCountry: "", currentCity: "", targetCountries: "",
  targetRoles: "", workRightDetails: "", sponsorshipNeeded: false,
  relocationWillingness: "depends", salaryExpectation: "", noticePeriod: "",
  baseCvText: "", projectSummaries: "", experienceHighlights: "",
};

export const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "", relocationAnswer: "", workAuthorisationAnswer: "",
  noticePeriodAnswer: "", salaryExpectationAnswer: "", motivationAnswer: "",
  strengthsAnswer: "", availabilityAnswer: "",
};

export const emptyJobAnalysis: JobAnalysisDraft = {
  jobTitle: "", company: "", jobUrl: "", location: "", workMode: "unknown",
  jobDescription: "", notes: "", skills: [], seniority: "", summary: "",
  gaps: [], fitScore: 0, positioningAngle: "", scoreFactors: [],
};

export const defaultDashboardState: CompanionDashboardState = {
  profile: emptyProfile,
  reusableAnswers: emptyReusableAnswers,
  jobAnalysis: emptyJobAnalysis,
  applications: [],
  interviewPrepPacks: [],
  evidenceRecords: [],
  outcomeRecords: [],
};

export function getUserScopedStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`;
}

export function normalizeLegacyDashboardState(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  const normalizeStatus = (status: unknown) =>
    status === "Applying" ? "Ready to apply" : status === "Closed" ? "Archived" : status;
  const normalizeItems = (items: unknown) =>
    Array.isArray(items)
      ? items.map((item) =>
          typeof item === "object" && item !== null
            ? { ...item, status: normalizeStatus((item as Record<string, unknown>).status) }
            : item)
      : items;
  return {
    ...record,
    applications: normalizeItems(record.applications),
    outcomeRecords: normalizeItems(record.outcomeRecords),
  };
}

export function isLegacySampleState(state: CompanionDashboardState) {
  return state.applications.length === 0 &&
    state.jobAnalysis.company === "Example FinTech" &&
    state.jobAnalysis.jobUrl === "https://example.com/jobs/business-systems-analyst";
}

export function clearLegacyProfilePlaceholders(state: CompanionDashboardState) {
  const profile = state.profile;
  const hasRealProfileEvidence = [
    profile.fullName, profile.email, profile.phone, profile.currentCity,
    profile.targetCountries, profile.targetRoles, profile.workRightDetails,
    profile.baseCvText, profile.projectSummaries, profile.experienceHighlights,
  ].some((value) => value.trim());
  if (profile.currentCountry !== "United Kingdom" || hasRealProfileEvidence) return state;
  return { ...state, profile: { ...profile, currentCountry: "" } };
}

export function getStoredState(userId: string) {
  if (typeof window === "undefined") return defaultDashboardState;
  try {
    const parsed = normalizeLegacyDashboardState(JSON.parse(
      window.localStorage.getItem(getUserScopedStorageKey(dashboardStorageKey, userId)) ?? "null",
    ));
    const result = companionDashboardStateSchema.safeParse(parsed);
    return result.success && !isLegacySampleState(result.data)
      ? clearLegacyProfilePlaceholders({
          ...defaultDashboardState,
          ...result.data,
          evidenceRecords: result.data.evidenceRecords ?? [],
          outcomeRecords: result.data.outcomeRecords ?? [],
        })
      : defaultDashboardState;
  } catch {
    return defaultDashboardState;
  }
}

export function saveState(state: CompanionDashboardState, userId: string) {
  window.localStorage.setItem(
    getUserScopedStorageKey(dashboardStorageKey, userId),
    JSON.stringify(state),
  );
  queueMicrotask(() => window.dispatchEvent(new Event(profileProtocolReadinessEvent)));
}
