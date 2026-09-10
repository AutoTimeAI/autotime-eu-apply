import type { CandidateProfile, ReusableAnswers } from "shared"
import {
  getInterviewBuddyDisclaimer,
  isImmigrationRelatedQuestion,
  normaliseSentence,
  validateInterviewBuddyInput
} from "./interview-buddy-policy"
import type { InterviewBuddyOutputs, InterviewCoachMeta } from "./types"

export const interviewQuestionOptions = [
  "Tell me about yourself.",
  "Why are you interested in this role?",
  "What is your strongest relevant experience?",
  "Tell me about a difficult stakeholder situation.",
  "Describe a project where you improved a process or system.",
  "What are your strengths?",
  "What is your notice period or availability?",
  "Do you need sponsorship or work authorisation support?"
]

export const emptyInterviewBuddyOutputs: InterviewBuddyOutputs = {
  professionalAnswer: "",
  naturalAnswer: "",
  lightFunnyAnswer: "",
  strongFinalAnswer: ""
}

export const emptyInterviewCoachMeta: InterviewCoachMeta = {
  evidenceScore: 0,
  riskFlags: [],
  missingEvidence: [],
  followUpDrills: [],
  boundaryNote:
    "AutoTime keeps interview prep evidence-first. Add your real notes, then review before using.",
  source: "local"
}

export function getProfileContextForInterview(profile: CandidateProfile) {
  return [
    profile.targetRoles && `Target roles: ${profile.targetRoles}`,
    profile.targetCountries && `Target countries: ${profile.targetCountries}`,
    profile.currentCountry && `Current country: ${profile.currentCountry}`,
    profile.experienceHighlights &&
      `Experience evidence: ${profile.experienceHighlights}`,
    profile.projectSummaries && `Project evidence: ${profile.projectSummaries}`,
    profile.baseCvText && `CV evidence: ${profile.baseCvText.slice(0, 420)}`
  ]
    .filter(Boolean)
    .join(" ")
}

export function getProofLibraryContextForInterview(reusableAnswers: ReusableAnswers) {
  return [
    reusableAnswers.motivationAnswer &&
      `Motivation proof: ${normaliseSentence(reusableAnswers.motivationAnswer)}`,
    reusableAnswers.strengthsAnswer &&
      `Strength proof: ${normaliseSentence(reusableAnswers.strengthsAnswer)}`,
    reusableAnswers.availabilityAnswer &&
      `Availability proof: ${normaliseSentence(reusableAnswers.availabilityAnswer)}`
  ]
    .filter(Boolean)
    .join(" ")
}

export function createInterviewBuddyOutputs({
  draft,
  profile,
  question,
  reusableAnswers
}: {
  draft: string
  profile: CandidateProfile
  question: string
  reusableAnswers: ReusableAnswers
}): InterviewBuddyOutputs {
  const cleanQuestion = question.trim()
  const cleanDraft = normaliseSentence(draft)
  const validationError = validateInterviewBuddyInput({
    draft,
    question
  })
  const profileContext = getProfileContextForInterview(profile)
  const proofLibraryContext = getProofLibraryContextForInterview(reusableAnswers)
  const evidenceLine = proofLibraryContext
    ? `I would connect that to my Proof Library: ${proofLibraryContext}`
    : profileContext
      ? `I would connect that to my profile evidence: ${normaliseSentence(profileContext)}`
      : "I would keep the answer limited to the experience I can clearly evidence."
  const limitLine =
    "I would avoid adding claims that are not already in my draft or saved profile."

  if (validationError || !cleanDraft) {
    return emptyInterviewBuddyOutputs
  }

  return {
    professionalAnswer: [
      `For "${cleanQuestion}", I would answer: ${cleanDraft}`,
      evidenceLine,
      limitLine
    ].join(" "),
    naturalAnswer: [
      cleanDraft,
      "The simple version is that I can explain what I did, what changed, and where I still need to be precise.",
      "I would keep it conversational and stay within what I can prove."
    ].join(" "),
    lightFunnyAnswer: [
      cleanDraft,
      "In plain terms, I try to be the person who turns messy work into something the team can actually use.",
      "That is the light version, but I would still keep the interview answer factual."
    ].join(" "),
    strongFinalAnswer: [
      `My answer to "${cleanQuestion}" would be: ${cleanDraft}`,
      evidenceLine,
      "The outcome I would emphasise is clearer delivery, better stakeholder confidence, and a practical next step.",
      limitLine
    ].join(" ")
  }
}

export function createLocalInterviewCoachMeta({
  draft,
  profile,
  question,
  reusableAnswers
}: {
  draft: string
  profile: CandidateProfile
  question: string
  reusableAnswers: ReusableAnswers
}): InterviewCoachMeta {
  const hasProofLibraryContent = Boolean(
    getProofLibraryContextForInterview(reusableAnswers).trim()
  )
  const missingEvidence = [
    !hasProofLibraryContent && "Add Proof Library reason or strength first",
    !profile.experienceHighlights.trim() && "Add experience highlights",
    !profile.projectSummaries.trim() && "Add one project or delivery example",
    !profile.workRightDetails.trim() && "Add verified work-right details",
    !draft.match(
      /\b(result|impact|improved|reduced|increased|delivered|saved|launched)\b/i
    ) && "Add a concrete outcome or result"
  ].filter(Boolean) as string[]
  const riskFlags = [
    isImmigrationRelatedQuestion(question) &&
      "Work-right answer needs official-source verification",
    draft.match(/\b(always|guarantee|expert in everything|perfect)\b/i) &&
      "Avoid overclaiming; keep the answer credible"
  ].filter(Boolean) as string[]

  return {
    evidenceScore: Math.max(
      25,
      90 - missingEvidence.length * 15 - riskFlags.length * 10
    ),
    riskFlags,
    missingEvidence,
    followUpDrills: [
      "Prepare one measurable result you can explain in under 30 seconds.",
      "Prepare one trade-off or mistake and what you changed afterwards.",
      "Prepare one point you would verify before answering in detail."
    ],
    boundaryNote:
      getInterviewBuddyDisclaimer(question) ||
      "Use this as preparation, not a script. Keep the final answer truthful and editable.",
    source: "local"
  }
}
