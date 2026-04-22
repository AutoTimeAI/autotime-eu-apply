import { getProfile, type CandidateProfile } from "../lib/storage"
import {
  canFillInput,
  detectFieldFromText,
  getFieldValues,
  type ProfileField
} from "../lib/autofill"

export const config = {
  matches: ["<all_urls>"]
}

type AutofillResponse = {
  filledFields: string[]
  message?: string
}

function getInputText(input: HTMLInputElement) {
  const labelText = Array.from(input.labels ?? [])
    .map((label) => label.textContent ?? "")
    .join(" ")

  return [
    input.autocomplete,
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label"),
    labelText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function detectField(input: HTMLInputElement): ProfileField | null {
  return detectFieldFromText(input.type, getInputText(input))
}

function canFill(input: HTMLInputElement) {
  return canFillInput({
    disabled: input.disabled,
    readOnly: input.readOnly,
    isVisible: input.getClientRects().length > 0,
    type: input.type,
    value: input.value
  })
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(input, "value")?.set
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value"
  )?.set

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(input, value)
  } else {
    input.value = value
  }

  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

async function autofillProfile(): Promise<AutofillResponse> {
  const profile = await getProfile()

  if (!profile) {
    return { filledFields: [], message: "No saved profile found" }
  }

  const values = getFieldValues(profile)
  const filledFields: string[] = []

  document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    if (!canFill(input)) {
      return
    }

    const field = detectField(input)
    if (!field || !values[field]) {
      return
    }

    setInputValue(input, values[field])
    filledFields.push(field)
    console.log(`[AutoTime EU Apply] Filled ${field}`, input)
  })

  console.log("[AutoTime EU Apply] Autofill complete", filledFields)

  return { filledFields }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AUTOTIME_AUTOFILL_PROFILE") {
    return false
  }

  autofillProfile().then(sendResponse)
  return true
})
