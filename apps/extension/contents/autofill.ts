import {
  getApplicationContentDraft,
  getProfile,
  getReusableAnswers
} from "../lib/storage"
import {
  getLinkedInManualInputMessage,
  inferJobPageDetails,
  isLinkedInUrl,
  type JobPageDetails
} from "../lib/job-page"
import {
  canFillInput,
  detectApplicationContentFromText,
  detectFieldFromText,
  detectReusableAnswerFromText,
  getApplicationContentValues,
  getFieldValues,
  getReusableAnswerValues,
  type ApplicationContentField,
  type ReusableAnswerField,
  type ProfileField
} from "../lib/autofill"

type AutofillResponse = {
  filledFields: string[]
  message?: string
}

type JobPageResponse = JobPageDetails & {
  message?: string
}

type TextControl = HTMLInputElement | HTMLTextAreaElement

function getControlText(control: TextControl) {
  const labelText = Array.from(control.labels ?? [])
    .map((label) => label.textContent ?? "")
    .join(" ")

  const parentText = control.parentElement?.textContent ?? ""

  return [
    control.name,
    control.id,
    control.placeholder,
    control.getAttribute("aria-label"),
    labelText,
    parentText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function detectField(input: HTMLInputElement): ProfileField | null {
  return detectFieldFromText(input.type, getControlText(input))
}

function detectReusableField(
  textarea: HTMLTextAreaElement
): ReusableAnswerField | null {
  return detectReusableAnswerFromText(getControlText(textarea))
}

function detectApplicationContentField(
  textarea: HTMLTextAreaElement
): ApplicationContentField | null {
  return detectApplicationContentFromText(getControlText(textarea))
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

function canFillTextarea(textarea: HTMLTextAreaElement) {
  return (
    !textarea.disabled &&
    !textarea.readOnly &&
    textarea.getClientRects().length > 0 &&
    textarea.value.trim() === ""
  )
}

function setControlValue(control: TextControl, value: string) {
  // Use the native value setter so React-controlled forms observe the change.
  const valueSetter = Object.getOwnPropertyDescriptor(control, "value")?.set
  const prototype = Object.getPrototypeOf(control) as TextControl
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value"
  )?.set

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(control, value)
  } else {
    control.value = value
  }

  control.dispatchEvent(new Event("input", { bubbles: true }))
  control.dispatchEvent(new Event("change", { bubbles: true }))
}

function getMetaContent(names: string[]) {
  for (const name of names) {
    const element = document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"], meta[property="${name}"]`
    )

    const content = element?.content.trim()
    if (content) {
      return content
    }
  }

  return ""
}

function getFirstText(selectors: string[]) {
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim()
    if (text) {
      return text
    }
  }

  return ""
}

function getLocationFromLinkedInDescription() {
  const description = getFirstText([
    ".jobs-unified-top-card__primary-description-container",
    ".topcard__flavor-row"
  ])
  const parts = description
    .split(/(?:\s+\u00b7\s+|\s+\u00c2\u00b7\s+)/)
    .map((part) => part.trim())

  return parts.length > 1 ? parts[1] : ""
}

function detectJobPage(): JobPageResponse {
  if (isLinkedInUrl(window.location.href)) {
    return {
      roleTitle: "",
      company: "",
      location: "",
      url: window.location.href,
      source: "linkedin.com",
      platform: "LinkedIn",
      pageTitle: document.title,
      message: getLinkedInManualInputMessage()
    }
  }

  // These selectors cover common job-board conventions while title parsing
  // provides a fallback for pages without structured job metadata.
  const pageTitle =
    getMetaContent(["og:title", "twitter:title"]) || document.title
  const company =
    getFirstText([
      ".jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
      ".posting-headline .company",
      ".company-name",
      "[data-testid='company-name']",
      "[data-testid='job-company-name']",
      "[class*='company']",
      "[data-automation-id='jobPostingCompany']",
      "[data-automation-id='company']"
    ]) || getMetaContent(["og:site_name", "application-name"])
  const location =
    getFirstText([
      ".jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
      ".posting-categories .location",
      ".location",
      "[data-testid='job-location']",
      "[class*='location']",
      "[data-automation-id='locations']",
      "[data-automation-id='job-details-location']"
    ]) || getLocationFromLinkedInDescription()

  const details = inferJobPageDetails({
    title: pageTitle,
    heading: getFirstText([
      ".jobs-unified-top-card__job-title",
      ".topcard__title",
      ".posting-headline h2",
      ".app-title",
      "h1",
      "[data-testid='job-title']",
      "[data-automation-id='jobPostingHeader']"
    ]),
    company,
    location,
    url: window.location.href
  })

  if (!details.roleTitle && !details.company) {
    return {
      ...details,
      message: "Could not detect job details on this page"
    }
  }

  return details
}

async function autofillProfile(): Promise<AutofillResponse> {
  if (isLinkedInUrl(window.location.href)) {
    return {
      filledFields: [],
      message: getLinkedInManualInputMessage()
    }
  }

  const profile = await getProfile()
  const answers = await getReusableAnswers()

  if (!profile && !answers) {
    return {
      filledFields: [],
      message: "No saved profile or reusable answers found"
    }
  }

  const profileValues = profile ? getFieldValues(profile) : null
  const answerValues = answers ? getReusableAnswerValues(answers) : null
  const filledFields: string[] = []

  document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    if (!profileValues || !canFill(input)) {
      return
    }

    const field = detectField(input)
    if (!field || !profileValues[field]) {
      return
    }

      setControlValue(input, profileValues[field])
      filledFields.push(field)
    })

  document
    .querySelectorAll<HTMLTextAreaElement>("textarea")
    .forEach((textarea) => {
      if (!answerValues || !canFillTextarea(textarea)) {
        return
      }

      const field = detectReusableField(textarea)
      if (!field || !answerValues[field]) {
        return
      }

      setControlValue(textarea, answerValues[field])
      filledFields.push(field)
    })

  return { filledFields }
}

async function insertApplicationContent(): Promise<AutofillResponse> {
  if (isLinkedInUrl(window.location.href)) {
    return {
      filledFields: [],
      message: getLinkedInManualInputMessage()
    }
  }

  const content = await getApplicationContentDraft()

  if (!content) {
    return {
      filledFields: [],
      message: "No saved application content found"
    }
  }

  const contentValues = getApplicationContentValues(content)
  const filledFields: string[] = []

  document
    .querySelectorAll<HTMLTextAreaElement>("textarea")
    .forEach((textarea) => {
      if (!canFillTextarea(textarea)) {
        return
      }

      const field = detectApplicationContentField(textarea)
      if (!field || !contentValues[field]) {
        return
      }

      setControlValue(textarea, contentValues[field])
      filledFields.push(field)
    })

  return { filledFields }
}

export function registerAutotimeContentScript() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "AUTOTIME_AUTOFILL_PROFILE") {
      autofillProfile().then(sendResponse)
      return true
    }

    if (message?.type === "AUTOTIME_INSERT_APPLICATION_CONTENT") {
      insertApplicationContent().then(sendResponse)
      return true
    }

    if (message?.type === "AUTOTIME_DETECT_JOB_PAGE") {
      sendResponse(detectJobPage())
      return false
    }

    return false
  })
}
