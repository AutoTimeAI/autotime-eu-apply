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

export const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  currentCountry: "",
  currentCity: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  noticePeriod: ""
}

export const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: ""
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
  status: "draft",
  nextAction: "",
  nextActionDate: "",
  notes: ""
}

export const applicationStatuses: ApplicationStatus[] = [
  "draft",
  "applied",
  "interview",
  "rejected",
  "offer"
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

export const sections: Array<{ id: Section; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "profile-view", label: "View Profile" },
  { id: "reusable-answers", label: "Reusable Answers" },
  { id: "reusable-answers-view", label: "View Answers" },
  { id: "job-analysis", label: "Job Analysis" },
  { id: "job-analysis-view", label: "View Job Analysis" },
  { id: "application-content", label: "Application Content" },
  { id: "application-content-view", label: "View Content" },
  { id: "tracker", label: "Tracker" },
  { id: "tracker-view", label: "View Tracker" },
  { id: "applications", label: "Applications" }
]
