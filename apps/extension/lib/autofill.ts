import type {
  ApplicationContentDraft,
  CandidateProfile,
  ReusableAnswers
} from "./storage"

export type ProfileField = "firstName" | "lastName" | "email" | "phone"
export type ApplicationContentField = keyof ApplicationContentDraft
export type ReusableAnswerField =
  | "sponsorshipAnswer"
  | "relocationAnswer"
  | "workAuthorisationAnswer"
  | "noticePeriodAnswer"
  | "salaryExpectationAnswer"
  | "motivationAnswer"
  | "strengthsAnswer"
  | "availabilityAnswer"

type FillableInputState = {
  disabled: boolean
  readOnly: boolean
  isVisible: boolean
  type: string
  value: string
}

const allowedInputTypes = new Set([
  "",
  "email",
  "search",
  "tel",
  "text",
  "url"
])

export function getNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  }
}

export function getFieldValues(
  profile: Pick<CandidateProfile, "fullName" | "email" | "phone">
): Record<ProfileField, string> {
  const { firstName, lastName } = getNameParts(profile.fullName)

  return {
    firstName,
    lastName,
    email: profile.email,
    phone: profile.phone
  }
}

export function getReusableAnswerValues(
  answers: ReusableAnswers
): Record<ReusableAnswerField, string> {
  return {
    sponsorshipAnswer: answers.sponsorshipAnswer,
    relocationAnswer: answers.relocationAnswer,
    workAuthorisationAnswer: answers.workAuthorisationAnswer,
    noticePeriodAnswer: answers.noticePeriodAnswer,
    salaryExpectationAnswer: answers.salaryExpectationAnswer,
    motivationAnswer: answers.motivationAnswer,
    strengthsAnswer: answers.strengthsAnswer,
    availabilityAnswer: answers.availabilityAnswer
  }
}

export function getApplicationContentValues(
  content: ApplicationContentDraft
): Record<ApplicationContentField, string> {
  return {
    coverLetter: content.coverLetter,
    profileSummary: content.profileSummary,
    motivationAnswer: content.motivationAnswer,
    strengthsAnswer: content.strengthsAnswer,
    availabilityAnswer: content.availabilityAnswer
  }
}

export function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

export function detectFieldFromText(
  inputType: string,
  inputText: string
): ProfileField | null {
  const text = inputText.toLowerCase()

  if (inputType === "email" || includesAny(text, ["email", "e-mail"])) {
    return "email"
  }

  if (
    inputType === "tel" ||
    includesAny(text, ["phone", "mobile", "telephone", "tel"])
  ) {
    return "phone"
  }

  if (
    text.includes("given-name") ||
    text.includes("firstname") ||
    text.includes("first name") ||
    text.includes("forename")
  ) {
    return "firstName"
  }

  if (
    text.includes("family-name") ||
    text.includes("lastname") ||
    text.includes("last name") ||
    text.includes("surname")
  ) {
    return "lastName"
  }

  return null
}

export function detectReusableAnswerFromText(
  fieldText: string
): ReusableAnswerField | null {
  const text = fieldText.toLowerCase()

  if (
    includesAny(text, [
      "sponsor",
      "sponsorship",
      "visa support",
      "require a visa",
      "need a visa"
    ])
  ) {
    return "sponsorshipAnswer"
  }

  if (includesAny(text, ["relocat", "move to", "willing to move"])) {
    return "relocationAnswer"
  }

  if (
    includesAny(text, [
      "authorised to work",
      "authorized to work",
      "work authorisation",
      "work authorization",
      "right to work",
      "eligible to work"
    ])
  ) {
    return "workAuthorisationAnswer"
  }

  if (
    includesAny(text, [
      "notice period",
      "start date",
      "available to start"
    ])
  ) {
    return "noticePeriodAnswer"
  }

  if (
    includesAny(text, [
      "salary",
      "compensation",
      "expected pay",
      "pay expectation",
      "desired pay"
    ])
  ) {
    return "salaryExpectationAnswer"
  }

  if (
    includesAny(text, [
      "why are you interested",
      "why do you want",
      "why this role",
      "motivation",
      "why join"
    ])
  ) {
    return "motivationAnswer"
  }

  if (
    includesAny(text, [
      "strength",
      "strengths",
      "what can you bring",
      "why are you a good fit",
      "relevant experience"
    ])
  ) {
    return "strengthsAnswer"
  }

  if (includesAny(text, ["availability", "available for interview"])) {
    return "availabilityAnswer"
  }

  return null
}

export function detectApplicationContentFromText(
  fieldText: string
): ApplicationContentField | null {
  const text = fieldText.toLowerCase()

  if (
    includesAny(text, [
      "cover letter",
      "covering letter",
      "supporting statement",
      "personal statement"
    ])
  ) {
    return "coverLetter"
  }

  if (
    includesAny(text, [
      "profile summary",
      "professional summary",
      "brief summary",
      "about you",
      "tell us about yourself"
    ])
  ) {
    return "profileSummary"
  }

  if (
    includesAny(text, [
      "why are you interested",
      "why do you want",
      "why this role",
      "motivation",
      "why join"
    ])
  ) {
    return "motivationAnswer"
  }

  if (
    includesAny(text, [
      "strength",
      "strengths",
      "what can you bring",
      "why are you a good fit",
      "relevant experience"
    ])
  ) {
    return "strengthsAnswer"
  }

  if (includesAny(text, ["availability", "available for interview"])) {
    return "availabilityAnswer"
  }

  return null
}

export function canFillInput(input: FillableInputState) {
  return (
    !input.disabled &&
    !input.readOnly &&
    input.isVisible &&
    allowedInputTypes.has(input.type) &&
    input.value.trim() === ""
  )
}
