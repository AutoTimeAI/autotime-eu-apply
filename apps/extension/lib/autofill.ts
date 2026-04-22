import type { CandidateProfile } from "./storage"

export type ProfileField = "firstName" | "lastName" | "email" | "phone"

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

export function canFillInput(input: FillableInputState) {
  return (
    !input.disabled &&
    !input.readOnly &&
    input.isVisible &&
    allowedInputTypes.has(input.type) &&
    input.value.trim() === ""
  )
}
