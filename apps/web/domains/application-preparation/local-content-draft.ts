import type {
  ApplicationContentSnapshot,
  ApplicationPositioningPack,
  ApplicationRecord,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers
} from "shared"

export function createApplicationContentSnapshot({
  application,
  job,
  positioningPack,
  profile,
  reusableAnswers
}: {
  application: ApplicationRecord
  job: JobAnalysisDraft
  positioningPack?: ApplicationPositioningPack
  profile: CandidateProfile
  reusableAnswers: ReusableAnswers
}): ApplicationContentSnapshot {
  const role = application.roleTitle || application.title || "this role"
  const company = application.company || "the company"
  const targetRoles = profile.targetRoles || "relevant technology roles"
  const profileEvidence =
    profile.experienceHighlights ||
    profile.projectSummaries ||
    profile.baseCvText.slice(0, 420)
  const positioning =
    positioningPack?.bestApplicationAngle ||
    job.positioningAngle ||
    application.fitDecision ||
    "evidence-led fit, role understanding and clear next steps"
  const workRight =
    reusableAnswers.workAuthorisationAnswer ||
    profile.workRightDetails ||
    "Add your verified work-right wording before using this answer."
  const motivation =
    reusableAnswers.motivationAnswer ||
    positioningPack?.motivationAnswerAngle ||
    `I am interested in ${role} at ${company} because the role connects with my target focus in ${targetRoles}.`
  const strengths =
    reusableAnswers.strengthsAnswer ||
    positioningPack?.strengthsAnswerAngle ||
    (profileEvidence
      ? `My strongest relevant evidence is: ${profileEvidence}`
      : "Add a specific project, outcome or responsibility from your evidence profile before using this answer.")
  const availability =
    reusableAnswers.availabilityAnswer ||
    profile.noticePeriod ||
    "Add your verified notice period or availability before using this answer."

  return {
    availabilityAnswer: availability,
    coverLetter: [
      `Dear ${company} team,`,
      "",
      positioningPack?.coverLetterAngle ||
        `I am applying for ${role}. My fit is strongest where the role needs ${positioning}.`,
      "",
      strengths,
      "",
      `Work-right context: ${workRight}`,
      "",
      "I would welcome the chance to discuss how this evidence maps to the role requirements."
    ].join("\n"),
    motivationAnswer: motivation,
    profileSummary:
      positioningPack?.recruiterSummaryAngle ||
      profileEvidence ||
      "Add profile evidence first, then regenerate this summary from verified facts.",
    savedAt: new Date().toISOString(),
    strengthsAnswer: strengths
  }
}
