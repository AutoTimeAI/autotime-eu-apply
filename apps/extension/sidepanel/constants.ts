import type {
  ApplicationContentDraft,
  ApplicationStatus,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers,
  TrackerDraft
} from "../lib/storage"

export type Section =
  | "profile"
  | "profile-view"
  | "reusable-answers"
  | "reusable-answers-view"
  | "job-analysis"
  | "job-analysis-view"
  | "application-content"
  | "application-content-view"
  | "tracker"
  | "tracker-view"
  | "applications"
  | "usage-log"
  | "validation-metrics"
  | "account"

export const onboardedStorageKey = "autotime-onboarded"

export const onboardingSteps: Array<{
  ctaLabel: string
  description: string
  section: Section
  title: string
}> = [
  {
    ctaLabel: "Go to Profile",
    description:
      "Start by saving your core candidate details so AutoTime can reuse them.",
    section: "profile",
    title: "Save your profile"
  },
  {
    ctaLabel: "Go to Reusable Answers",
    description:
      "Add answers for sponsorship, relocation, availability, and common prompts.",
    section: "reusable-answers",
    title: "Add reusable answers"
  },
  {
    ctaLabel: "Go to Job Analysis",
    description:
      "Import a non-LinkedIn job page or paste a job description before tailoring an application.",
    section: "job-analysis",
    title: "Import a job page or paste a description"
  }
]

export const emptyProfile: CandidateProfile = {
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

export const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "",
  salaryExpectationAnswer: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

export const emptyJobAnalysisDraft: JobAnalysisDraft = {
  jobTitle: "",
  company: "",
  jobUrl: "",
  location: "",
  workMode: "unknown",
  jobDescription: "",
  notes: ""
}

export const emptyApplicationContentDraft: ApplicationContentDraft = {
  coverLetter: "",
  profileSummary: "",
  motivationAnswer: "",
  strengthsAnswer: "",
  availabilityAnswer: ""
}

export const emptyTrackerDraft: TrackerDraft = {
  roleTitle: "",
  company: "",
  applicationUrl: "",
  status: "Saved",
  nextAction: "",
  nextActionDate: "",
  notes: ""
}

export const applicationStatuses: ApplicationStatus[] = [
  "Saved",
  "Applying",
  "Applied",
  "Interview",
  "Rejected",
  "Closed"
]

export const noticePeriodOptions = [
  "Immediately available",
  "1 week",
  "2 weeks",
  "1 month",
  "2 months",
  "3 months",
  "More than 3 months",
  "Negotiable"
]

export const sections: Array<{ group: string; id: Section; label: string }> = [
  { group: "Memory", id: "profile", label: "Profile" },
  { group: "Memory", id: "profile-view", label: "View Profile" },
  { group: "Memory", id: "reusable-answers", label: "Reusable Answers" },
  { group: "Memory", id: "reusable-answers-view", label: "View Answers" },
  { group: "Apply", id: "job-analysis", label: "Job Analysis" },
  { group: "Apply", id: "job-analysis-view", label: "View Job Analysis" },
  { group: "Apply", id: "application-content", label: "Application Content" },
  { group: "Apply", id: "application-content-view", label: "View Content" },
  { group: "Track", id: "tracker", label: "Tracker" },
  { group: "Track", id: "tracker-view", label: "View Tracker" },
  { group: "Track", id: "applications", label: "Applications" },
  { group: "Review", id: "usage-log", label: "Usage Log" },
  { group: "Review", id: "validation-metrics", label: "Validation Metrics" },
  { group: "Review", id: "account", label: "Account" }
]
