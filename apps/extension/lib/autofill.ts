// Field-matching logic for the autofill feature in contents/autofill.ts:
// given a form input/textarea's surrounding text (name, id, placeholder,
// label, aria-label, parent text), decides which saved profile field,
// reusable answer, or application-content field it most likely represents,
// and whether the control is even safe to fill (visible, enabled, empty).
// Pure text/DOM-state logic only - no chrome.* APIs - so it is unit
// testable and reusable outside a real content-script context.
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

/** Splits a full name into `firstName` (first token) and `lastName` (the rest, rejoined). */
export function getNameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  }
}

/** Maps a saved profile to the flat `{firstName, lastName, email, phone}` shape autofill fills into `<input>` elements. */
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

/** Maps saved ReusableAnswers to a `Record<ReusableAnswerField, string>` keyed the same way autofill's field detection returns keys. */
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

/** Maps a saved ApplicationContentDraft to a `Record<ApplicationContentField, string>` for the "Insert Saved Content" autofill pass. */
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

/**
 * Detects which profile field (email/phone/firstName/lastName) an `<input>`
 * represents, from its HTML `type` attribute plus the input's combined
 * label/name/id/placeholder/aria-label/parent text (see `getControlText` in
 * contents/autofill.ts). Returns `null` if no field is recognized.
 */
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

/**
 * Detects which saved reusable answer (sponsorship, relocation, work
 * authorisation, notice period, salary expectation, motivation, strengths,
 * or availability) a `<textarea>`'s surrounding text is asking for, via
 * keyword phrase matching. Returns `null` if nothing matches.
 */
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

/**
 * Detects which saved application-content field (cover letter, profile
 * summary, motivation, strengths, or availability) a `<textarea>`'s
 * surrounding text is asking for. Shares keyword phrases with
 * `detectReusableAnswerFromText` for the fields both drafts have in common.
 */
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

/**
 * Guards against autofilling a control that isn't safe to touch: must be
 * enabled, not read-only, actually visible (has client rects), an allowed
 * text-like input type, and currently empty (autofill never overwrites a
 * value the user already entered).
 */
export function canFillInput(input: FillableInputState) {
  return (
    !input.disabled &&
    !input.readOnly &&
    input.isVisible &&
    allowedInputTypes.has(input.type) &&
    input.value.trim() === ""
  )
}
