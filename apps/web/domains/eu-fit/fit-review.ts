import {
  evaluateAutoTimeFitScore,
  type ApplicationRecord,
  type AutoTimeFitReview,
  type CandidateProfile,
  type CountryFitEvaluation,
  type JobAnalysisDraft
} from "shared"

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export function mergeAutoTimeFitReview(
  localReview: AutoTimeFitReview,
  source: Partial<JobAnalysisDraft> & Partial<ApplicationRecord>
): AutoTimeFitReview {
  return {
    ...localReview,
    fitScore:
      typeof source.fitScore === "number" ? source.fitScore : localReview.fitScore,
    fitLabel: source.fitLabel ?? localReview.fitLabel,
    confidenceLevel: source.confidenceLevel ?? localReview.confidenceLevel,
    scoreBreakdown: source.scoreBreakdown?.length
      ? source.scoreBreakdown
      : localReview.scoreBreakdown,
    matchedSignals: source.matchedSignals?.length
      ? source.matchedSignals
      : localReview.matchedSignals,
    missingSignals: source.missingSignals?.length
      ? source.missingSignals
      : localReview.missingSignals,
    riskAreas: source.riskAreas?.length
      ? source.riskAreas
      : localReview.riskAreas,
    suggestedCvPositioning:
      source.suggestedCvPositioning || localReview.suggestedCvPositioning,
    suggestedNextAction:
      source.suggestedNextAction || localReview.suggestedNextAction,
    shortSummary: source.shortSummary || localReview.shortSummary,
    disclaimer: source.disclaimer || localReview.disclaimer
  }
}

export function getJobFitReview({
  job,
  profile
}: {
  job: JobAnalysisDraft
  profile: CandidateProfile
}): AutoTimeFitReview {
  return mergeAutoTimeFitReview(
    evaluateAutoTimeFitScore({
      profile,
      job
    }),
    job
  )
}

export function getApplicationFitReview({
  application,
  job,
  profile
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  profile: CandidateProfile
}): AutoTimeFitReview {
  return mergeAutoTimeFitReview(
    evaluateAutoTimeFitScore({
      profile,
      job
    }),
    application
  )
}

export function createApplication(
  job: JobAnalysisDraft,
  fitEvaluation: CountryFitEvaluation,
  autoTimeFitReview: AutoTimeFitReview
): ApplicationRecord {
  const title = job.jobTitle || "Untitled role"
  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: title,
    company: job.company || undefined,
    url: job.jobUrl || "Manual dashboard entry",
    source: getHostname(job.jobUrl),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "Saved",
    nextAction: fitEvaluation.nextBestAction,
    nextActionDate: "",
    outcomeReason: "Unknown",
    notes: [
      fitEvaluation.decision,
      fitEvaluation.positioningAngle,
      job.positioningAngle || job.notes,
      fitEvaluation.learningPrompt
    ]
      .filter(Boolean)
      .join(" "),
    fitScore: autoTimeFitReview.fitScore,
    fitLabel: autoTimeFitReview.fitLabel,
    confidenceLevel: autoTimeFitReview.confidenceLevel,
    scoreBreakdown: autoTimeFitReview.scoreBreakdown,
    matchedSignals: autoTimeFitReview.matchedSignals,
    missingSignals: autoTimeFitReview.missingSignals,
    riskAreas: autoTimeFitReview.riskAreas,
    suggestedCvPositioning: autoTimeFitReview.suggestedCvPositioning,
    suggestedNextAction: autoTimeFitReview.suggestedNextAction,
    shortSummary: autoTimeFitReview.shortSummary,
    disclaimer: autoTimeFitReview.disclaimer,
    fitDecision: fitEvaluation.decision,
    contentGate: fitEvaluation.contentGate
  }
}
