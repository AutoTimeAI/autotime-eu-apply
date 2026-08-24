// Local, offline template generator for application content (cover letter,
// profile summary, motivation/strengths/availability answers). Used as the
// no-AI fallback in sidepanel/main.tsx whenever the user isn't signed in or
// the backend AI call (lib/openai.ts) fails, so "Generate from Saved Data"
// always produces something rather than erroring out.
import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers
} from "./storage"

function firstFilled(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? ""
}

function sentence(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function compactJoin(parts: string[], separator: string) {
  return parts.filter(Boolean).join(separator)
}

function getRoleFocus(profile: CandidateProfile, job: JobAnalysisDraft) {
  return firstFilled(profile.targetRoles, job.jobTitle, "the role")
}

/**
 * Builds a full ApplicationContentDraft by filling fixed sentence templates
 * with whatever profile/job/reusable-answer text is available (preferring
 * saved reusable answers, falling back to profile fields, then generic
 * text). Purely template-based - invents nothing not already present in
 * `profile`/`job`/`reusableAnswers`. See lib/openai.ts for the AI-backed
 * equivalent this is a fallback for.
 */
export function generateApplicationContentDraft(
  profile: CandidateProfile,
  job: JobAnalysisDraft,
  reusableAnswers: ReusableAnswers | null
): ApplicationContentDraft {
  const roleFocus = getRoleFocus(profile, job)
  const positioning = firstFilled(
    job.positioningAngle,
    profile.experienceHighlights,
    profile.projectSummaries,
    profile.baseCvText
  )
  const workRightContext = firstFilled(
    reusableAnswers?.workAuthorisationAnswer,
    profile.workRightDetails
  )
  const availability = firstFilled(
    reusableAnswers?.availabilityAnswer,
    reusableAnswers?.noticePeriodAnswer,
    profile.noticePeriod
  )

  const coverLetter = compactJoin(
    [
      `Dear ${job.company || "hiring"} team,`,
      `I am applying for the ${job.jobTitle || roleFocus} role${
        job.company ? ` at ${job.company}` : ""
      }.`,
      sentence(positioning),
      sentence(profile.experienceHighlights),
      sentence(profile.projectSummaries),
      `I am especially interested in this opportunity because it matches ${roleFocus} across ${firstFilled(
        job.location,
        profile.targetCountries,
        "my target market"
      )}.`,
      sentence(workRightContext),
      `Thank you for considering my application.`
    ],
    "\n\n"
  )

  const profileSummary = compactJoin(
    [
      `${profile.fullName} is a candidate focused on ${roleFocus}.`,
      sentence(firstFilled(profile.baseCvText, profile.experienceHighlights)),
      sentence(profile.projectSummaries),
      sentence(workRightContext)
    ],
    " "
  )

  const motivationAnswer =
    reusableAnswers?.motivationAnswer ||
    compactJoin(
      [
        `I am motivated by the ${job.jobTitle || "role"} because it connects to ${roleFocus}.`,
        sentence(positioning),
        job.scoreFactors?.length
          ? `The strongest fit signals are ${job.scoreFactors
              .slice(0, 2)
              .join(" ")}`
          : ""
      ],
      " "
    )

  const strengthsAnswer =
    reusableAnswers?.strengthsAnswer ||
    compactJoin(
      [
        sentence(profile.experienceHighlights),
        sentence(profile.projectSummaries),
        sentence(profile.workRightDetails)
      ],
      " "
    )

  return {
    coverLetter,
    profileSummary,
    motivationAnswer,
    strengthsAnswer,
    availabilityAnswer: sentence(availability)
  }
}
