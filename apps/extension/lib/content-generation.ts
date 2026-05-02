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

  const motivationAnswer = compactJoin(
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

  const strengthsAnswer = compactJoin(
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
