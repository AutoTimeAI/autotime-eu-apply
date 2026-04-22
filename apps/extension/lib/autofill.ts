import type { CandidateProfile, ReusableAnswers } from "./storage"

export type ProfileField = "firstName" | "lastName" | "email" | "phone"
export type ReusableAnswerField =
  | "sponsorshipAnswer"
  | "relocationAnswer"
  | "workAuthorisationAnswer"
  | "noticePeriodAnswer"

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
    noticePeriodAnswer: answers.noticePeriodAnswer
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
      "available to start",
      "availability"
    ])
  ) {
    return "noticePeriodAnswer"
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
