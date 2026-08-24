// Builds the "V2 dashboard state" JSON bundle for the manual export feature
// (Applications section's "Export V2 Dashboard JSON" button) - a snapshot
// of profile, reusable answers, latest job analysis, and all applications,
// validated against the shared `companionDashboardStateSchema` so the
// exported file is guaranteed to match what the web dashboard expects to
// import.
import {
  companionDashboardStateSchema,
  type CompanionDashboardState
} from "shared"
import type {
  ApplicationRecord,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers
} from "./storage"

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "",
  currentCity: "",
  targetCountries: "",
  targetRoles: "",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: "",
  projectSummaries: "",
  experienceHighlights: ""
}

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "",
  salaryExpectationAnswer: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

const emptyJobAnalysis: JobAnalysisDraft = {
  jobTitle: "",
  company: "",
  jobUrl: "",
  location: "",
  workMode: "unknown",
  jobDescription: "",
  notes: ""
}

/**
 * Assembles a CompanionDashboardState from whatever the caller has saved so
 * far, substituting empty defaults for `profile`/`reusableAnswers`/
 * `jobAnalysis` when `null`, and parses the result through
 * `companionDashboardStateSchema` (throws if it somehow doesn't validate).
 * `interviewPrepPacks` is always `[]` - the extension doesn't manage that
 * data, only the dashboard does.
 */
export function createV2DashboardState({
  applications,
  jobAnalysis,
  profile,
  reusableAnswers
}: {
  applications: ApplicationRecord[]
  jobAnalysis: JobAnalysisDraft | null
  profile: CandidateProfile | null
  reusableAnswers: ReusableAnswers | null
}): CompanionDashboardState {
  const dashboardState = {
    profile: profile ?? emptyProfile,
    reusableAnswers: reusableAnswers ?? emptyReusableAnswers,
    jobAnalysis: jobAnalysis ?? emptyJobAnalysis,
    applications,
    interviewPrepPacks: []
  }

  return companionDashboardStateSchema.parse(dashboardState)
}

export function v2DashboardStateToJson(state: CompanionDashboardState) {
  return JSON.stringify(state, null, 2)
}
