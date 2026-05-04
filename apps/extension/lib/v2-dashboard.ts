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
