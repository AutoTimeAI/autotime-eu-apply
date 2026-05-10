import {
  getAccountSession,
  getApplicationContentDraft,
  getApplications,
  getProfile,
  getReusableAnswers,
  saveApplication,
  type AccountSession,
  type ApplicationRecord
} from "../lib/storage"
import {
  formatJobPageNotes,
  getLinkedInManualInputMessage,
  inferJobPageDetails,
  isLinkedInUrl,
  type JobPageDetails
} from "../lib/job-page"
import { hasApplicationWithUrl } from "../lib/applications"
import { appUrl } from "../lib/openai"
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

const widgetHostId = "autotime-draggable-job-widget"
const widgetPositionKey = "autotime-draggable-job-widget-position"
const widgetToggleEventName = "autotime-toggle-widget"
const widgetRightOffset = 12
const fullWidgetWidth = 480
const fullWidgetHeight = 420
const minWidgetWidth = 64
const minWidgetHeight = 64
const noJobDescriptionMessage =
  "No job description found. Update your description and click the button below to retrieve insights."
const insightKeywords = [
  "python",
  "openai",
  "anthropic",
  "llm",
  "rag",
  "nlp",
  "api",
  "document",
  "financial",
  "dashboard",
  "data",
  "analysis",
  "modelling",
  "legal",
  "risk",
  "market"
]

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

function getWordCount(text = "") {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function getDetectedKeywords(description = "") {
  const normalized = description.toLowerCase()

  return insightKeywords
    .filter((keyword) => normalized.includes(keyword))
    .slice(0, 6)
}

function getBasicInsights(details: JobPageResponse | null) {
  if (!details?.jobDescription.trim()) {
    return [noJobDescriptionMessage]
  }

  const wordCount = getWordCount(details.jobDescription)
  const keywords = getDetectedKeywords(details.jobDescription)

  return [
    details.platform !== "Generic"
      ? `Detected from ${details.platform}.`
      : "Detected from the current job page.",
    `${wordCount} words in the visible job description.`,
    details.location
      ? `Location signal: ${details.location}.`
      : "Location was not clearly detected.",
    keywords.length > 0
      ? `Core signals: ${keywords.join(", ")}.`
      : "No keyword signals detected yet."
  ]
}

function getDeepInsights(details: JobPageResponse | null) {
  if (!details) {
    return [
      "Role positioning angle",
      "Evidence gaps against the job description",
      "Application risk and priority recommendation"
    ]
  }

  const keywords = getDetectedKeywords(details.jobDescription)
  const role = details.roleTitle || "this role"
  const company = details.company || "the company"

  return [
    `Position ${role} around ${keywords[0] ?? "the strongest repeated job signal"}.`,
    `Prepare evidence for ${keywords.slice(0, 3).join(", ") || "the top requirements"} before applying.`,
    `Review ${company} fit, location and work-right risk in the dashboard before sending materials.`
  ]
}

function getStoredWidgetPosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(widgetPositionKey) ?? "{}") as
      Partial<{ left: number; top: number }>

    if (typeof parsed.left === "number" && typeof parsed.top === "number") {
      return parsed
    }
  } catch {
    // Ignore invalid page storage and fall back to the default position.
  }

  return null
}

function clampWidgetPosition(
  left: number,
  top: number,
  width = fullWidgetWidth,
  height = fullWidgetHeight
) {
  const margin = 12
  const maxLeft = Math.max(margin, window.innerWidth - width - margin)
  const maxTop = Math.max(margin, window.innerHeight - height - margin)

  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop)
  }
}

function saveWidgetPosition(left: number, top: number) {
  localStorage.setItem(widgetPositionKey, JSON.stringify({ left, top }))
}

function createApplicationRecord(details: JobPageResponse): ApplicationRecord {
  const title = details.roleTitle || details.pageTitle || details.url

  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: details.roleTitle || title,
    company: details.company || undefined,
    url: details.url,
    source: details.source,
    createdAt: new Date().toISOString(),
    status: "Saved",
    notes: [details.jobDescription, formatJobPageNotes(details)]
      .filter(Boolean)
      .join("\n\n")
  }
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

function cleanVisibleText(value = "") {
  return value.replace(/\s+/g, " ").trim()
}

function getHtmlText(value = "") {
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return cleanVisibleText(value)
  }

  const template = document.createElement("template")
  template.innerHTML = value

  return cleanVisibleText(template.content.textContent ?? value)
}

function getJsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(getJsonLdNodes)
  }

  if (!value || typeof value !== "object") {
    return []
  }

  const item = value as Record<string, unknown>

  return [
    item,
    ...getJsonLdNodes(item["@graph"]),
    ...getJsonLdNodes(item.itemListElement)
  ]
}

function hasJsonLdType(item: Record<string, unknown>, type: string) {
  const itemType = item["@type"]

  return Array.isArray(itemType)
    ? itemType.includes(type)
    : itemType === type
}

function getJsonLdJobPosting() {
  const scripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]'
    )
  )

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? "") as unknown
      const posting = getJsonLdNodes(parsed).find((item) =>
        hasJsonLdType(item, "JobPosting")
      )

      if (posting) {
        return posting
      }
    } catch {
      // Ignore invalid third-party JSON-LD and fall back to visible text.
    }
  }

  return null
}

function getFirstText(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector)
    const text = cleanVisibleText(element?.innerText || element?.textContent || "")
    if (text) {
      return text
    }
  }

  return ""
}

function getLongestText(selectors: string[]) {
  const texts = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => cleanVisibleText(element.innerText || element.textContent || ""))
      .filter(Boolean)
  )

  return texts.sort((a, b) => b.length - a.length)[0] ?? ""
}

function cleanLinkedInDescription(value = "") {
  return cleanVisibleText(value)
    .replace(/^About the job\s*/i, "")
    .replace(/^About the role\s*/i, "")
    .replace(/\bShow more\b|\bShow less\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

function getPageVisibleText() {
  return (document.body?.innerText || document.body?.textContent || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function getTextAfterMarker(
  text: string,
  markers: string[],
  endMarkers: string[]
) {
  const lowerText = text.toLowerCase()

  for (const marker of markers) {
    const markerIndex = lowerText.indexOf(marker.toLowerCase())

    if (markerIndex === -1) {
      continue
    }

    const start = markerIndex + marker.length
    const end = endMarkers.reduce((nearest, endMarker) => {
      const endIndex = lowerText.indexOf(endMarker.toLowerCase(), start)

      return endIndex !== -1 && endIndex < nearest ? endIndex : nearest
    }, text.length)

    return text.slice(start, end)
  }

  return ""
}

function getLinkedInJobDescriptionFromVisibleText() {
  const description = getTextAfterMarker(
    getPageVisibleText(),
    ["About the job", "About the role", "Job description", "Description"],
    [
      "\nSeniority level",
      "\nEmployment type",
      "\nJob function",
      "\nIndustries",
      "\nReferrals increase",
      "\nSee who",
      "\nShow more jobs",
      "\nSimilar jobs"
    ]
  )

  return getWordCount(description) >= 10
    ? cleanLinkedInDescription(description)
    : ""
}

function getLinkedInJobDescription() {
  const description = getLongestText([
    "#job-details",
    ".jobs-description",
    ".jobs-description__container",
    ".jobs-description__content",
    ".jobs-box__html-content",
    ".jobs-description-content__text",
    ".show-more-less-html__markup",
    "[class*='jobs-description']"
  ])

  return getWordCount(description) >= 10
    ? cleanLinkedInDescription(description)
    : getLinkedInJobDescriptionFromVisibleText()
}

function getJobDescription() {
  if (isLinkedInUrl(window.location.href)) {
    const linkedInDescription = getLinkedInJobDescription()

    if (linkedInDescription) {
      return linkedInDescription
    }
  }

  const selectedDescription = getLongestText([
    ".jobs-description__content",
    ".jobs-box__html-content",
    ".jobs-description-content__text",
    ".show-more-less-html__markup",
    "[data-test-job-description]",
    "[data-testid='job-description']",
    "[data-testid='description']",
    "[data-qa='job-description']",
    "[data-ph-at-id='description-text']",
    "[data-ui='job-description']",
    "[data-automation-id='jobPostingDescription']",
    "[data-automation-id='jobDescription']",
    "[itemprop='description']",
    "#job-description",
    "#jobDescription",
    ".posting-description",
    ".job-description",
    ".jobsearch-JobComponent-description",
    ".description__text",
    ".ats-description",
    ".job-posting-description",
    "section.description"
  ])

  if (getWordCount(selectedDescription) >= 20) {
    return selectedDescription
  }

  const descriptionContainers = Array.from(
    document.querySelectorAll<HTMLElement>(
      "article, main, section, div[id], div[class], section[id], section[class]"
    )
  )
    .filter((element) => {
      const signature = [
        element.id,
        element.className,
        element.getAttribute("data-testid"),
        element.getAttribute("data-automation-id"),
        element.getAttribute("aria-label")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return /description|details|posting|job-content|jobcontent/.test(signature)
    })
    .map((element) => cleanVisibleText(element.innerText || element.textContent || ""))
    .filter((text) => getWordCount(text) >= 20)

  return descriptionContainers.sort((a, b) => b.length - a.length)[0] ?? selectedDescription
}

function getLinkedInTopCardText() {
  return getFirstText([
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".jobs-unified-top-card__primary-description-container",
    ".jobs-unified-top-card__subtitle-primary-grouping",
    ".topcard__flavor-row"
  ])
}

function getLinkedInTopCardParts() {
  return getLinkedInTopCardText()
    .split(/(?:\s*[·•]\s*|\s+\u00c2\u00b7\s+|\n+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^(verified|follow|promoted)$/i.test(part))
}

function parseLinkedInTopCardCompany() {
  const parts = getLinkedInTopCardParts()
  const company = parts.find(
    (part) =>
      !/\b(?:applicant|reposted|posted|remote|hybrid|on-site|onsite|full-time|part-time|contract)\b/i.test(
        part
      )
  )

  return company ?? ""
}

function parseLinkedInTopCardLocation() {
  const parts = getLinkedInTopCardParts()
  const location = parts.find(
    (part, index) =>
      index > 0 &&
      !/\b(?:applicant|reposted|posted|actively recruiting|promoted|remote|hybrid|on-site|onsite|full-time|part-time|contract)\b/i.test(
        part
      )
  )

  return location ?? ""
}

function cleanLinkedInLocation(value = "") {
  const withoutStatus = cleanVisibleText(value)
    .replace(/\b(?:reposted|posted)\s+\d+\s+(?:minute|hour|day|week|month)s?\s+ago\b.*$/i, "")
    .replace(/\b\d+\s+(?:minute|hour|day|week|month)s?\s+ago\b.*$/i, "")
    .replace(/\b\d+\s+applicants?.*$/i, "")
    .replace(/\bActively recruiting\b.*$/i, "")
    .trim()
  const parts = withoutStatus
    .split(/(?:\s*[·•]\s*|\s+\u00c2\u00b7\s+|\n+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(
      (part) =>
        !/\b(?:applicant|reposted|posted|promoted|actively recruiting)\b/i.test(
          part
        )
    )

  return parts[0] ?? ""
}

function parseLinkedInVisibleLocation() {
  const lines = getPageVisibleText()
    .split("\n")
    .map((line) => cleanLinkedInLocation(line))
    .filter(Boolean)
    .slice(0, 80)
  const location = lines.find(
    (line) =>
      /,/.test(line) &&
      !/\b(?:connections|followers|applicant|message|search|notification|home|jobs)\b/i.test(
        line
      )
  )

  return location ?? ""
}

function getLinkedInWorkplaceType() {
  const explicit = getFirstText([
    ".jobs-unified-top-card__workplace-type",
    ".job-details-jobs-unified-top-card__workplace-type",
    ".jobs-unified-top-card__job-insight span",
    ".job-details-jobs-unified-top-card__job-insight span"
  ])

  if (/\bremote\b/i.test(explicit)) {
    return "Remote"
  }

  if (/\bhybrid\b/i.test(explicit)) {
    return "Hybrid"
  }

  if (/\b(?:on-site|onsite)\b/i.test(explicit)) {
    return "On-site"
  }

  const topCardText = getLinkedInTopCardText()

  if (/\bremote\b/i.test(topCardText)) {
    return "Remote"
  }

  if (/\bhybrid\b/i.test(topCardText)) {
    return "Hybrid"
  }

  if (/\b(?:on-site|onsite)\b/i.test(topCardText)) {
    return "On-site"
  }

  return ""
}

function formatLinkedInLocation(location: string, workplaceType: string) {
  const cleanLocation = cleanLinkedInLocation(location)

  if (!cleanLocation) {
    return workplaceType
  }

  if (
    !workplaceType ||
    cleanLocation.toLowerCase().includes(workplaceType.toLowerCase())
  ) {
    return cleanLocation
  }

  return `${cleanLocation} (${workplaceType})`
}

function getJsonLdText(value: unknown): string {
  if (typeof value === "string") {
    return cleanVisibleText(value)
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const item = value as Record<string, unknown>
  return getJsonLdText(item.name) || getJsonLdText(item.value)
}

function getJsonLdAddressText(value: unknown): string {
  const item = Array.isArray(value) ? value[0] : value

  if (typeof item === "string") {
    return cleanVisibleText(item)
  }

  if (!item || typeof item !== "object") {
    return ""
  }

  const record = item as Record<string, unknown>
  const address =
    record.address && typeof record.address === "object"
      ? (record.address as Record<string, unknown>)
      : record

  return [
    getJsonLdText(address.addressLocality),
    getJsonLdText(address.addressRegion),
    getJsonLdText(address.addressCountry)
  ]
    .filter(Boolean)
    .join(", ")
}

function detectJobPage(): JobPageResponse {
  const jsonLdPosting = getJsonLdJobPosting()
  const jsonLdHiringOrganization = jsonLdPosting?.hiringOrganization as
    | { name?: string }
    | undefined
  const jsonLdLocationText =
    getJsonLdAddressText(jsonLdPosting?.jobLocation) ||
    getJsonLdAddressText(jsonLdPosting?.applicantLocationRequirements) ||
    (getJsonLdText(jsonLdPosting?.jobLocationType) === "TELECOMMUTE"
      ? "Remote"
      : getJsonLdText(jsonLdPosting?.jobLocationType))
  const jsonLdDescription =
    typeof jsonLdPosting?.description === "string"
      ? getHtmlText(jsonLdPosting.description)
      : ""

  // These selectors cover common job-board conventions while title parsing
  // provides a fallback for pages without structured job metadata.
  const pageTitle =
    (typeof jsonLdPosting?.title === "string" ? jsonLdPosting.title : "") ||
    getMetaContent(["og:title", "twitter:title"]) ||
    document.title
  const company =
    (typeof jsonLdHiringOrganization?.name === "string"
      ? jsonLdHiringOrganization.name
      : "") ||
    getFirstText([
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__primary-description-container a",
      ".topcard__org-name-link",
      ".posting-headline .company",
      ".company-name",
      "[data-testid='company-name']",
      "[data-testid='job-company-name']",
      "[data-testid='company']",
      "[data-ui='company-name']",
      "[class*='company']",
      "[data-automation-id='jobPostingCompany']",
      "[data-automation-id='company']"
    ]) ||
    (isLinkedInUrl(window.location.href) ? parseLinkedInTopCardCompany() : "") ||
    getMetaContent(["og:site_name", "application-name"])
  const linkedInWorkplaceType = isLinkedInUrl(window.location.href)
    ? getLinkedInWorkplaceType()
    : ""
  const location =
    jsonLdLocationText ||
    (isLinkedInUrl(window.location.href)
      ? formatLinkedInLocation(
          getFirstText([
            ".jobs-unified-top-card__bullet",
            ".job-details-jobs-unified-top-card__bullet",
            ".topcard__flavor--bullet",
            "[data-automation-id='job-details-location']"
          ]) ||
            parseLinkedInTopCardLocation() ||
            parseLinkedInVisibleLocation(),
          linkedInWorkplaceType
        )
      : getFirstText([
          ".posting-categories .location",
          ".location",
          "[data-testid='job-location']",
          "[data-testid='location']",
          "[data-ui='job-location']",
          "[class*='location']",
          "[data-automation-id='locations']",
          "[data-automation-id='job-details-location']"
        ]))

  const details = inferJobPageDetails({
    title: pageTitle,
    heading: getFirstText([
      ".job-details-jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title a",
      ".job-details-jobs-unified-top-card__job-title a",
      ".topcard__title",
      ".posting-headline h2",
      ".app-title",
      "h1",
      "[data-testid='job-title']",
      "[data-testid='jobTitle']",
      "[data-ui='job-title']",
      "[data-automation-id='jobPostingHeader']"
    ]),
    company,
    location,
    description:
      jsonLdDescription || getJobDescription(),
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderList(items: string[], className = "") {
  const classAttribute = className ? ` class="${className}"` : ""

  return `<ul${classAttribute}>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`
}

function getWidgetMarkup({
  accountSession,
  details,
  status
}: {
  accountSession: AccountSession | null
  details: JobPageResponse | null
  status: string
}) {
  const isProCustomer = accountSession?.plan === "pro"
  const hasParsedDescription = Boolean(details?.jobDescription.trim())
  const basicInsights = getBasicInsights(details)
  const deepInsights = getDeepInsights(details)
  const jobTitle = details?.roleTitle || "Not tracked yet"
  const company = details?.company || "Not detected"
  const location = details?.location || "Not detected"
  const platform = details?.platform || "Waiting"
  const source = details?.source || "Waiting"
  const description = details?.jobDescription
    ? `${getWordCount(details.jobDescription)} words parsed`
    : "Not parsed yet"
  const shouldShowDeepInsightList = hasParsedDescription || isProCustomer
  const statusHelp = /^tracking/i.test(status)
    ? "Please wait while AutoTime saves this role."
    : /tracked/i.test(status)
      ? "Saved roles appear in the AutoTime dashboard tracker."
      : "Check the visible job page and try again."

  return `
    <style>
      :host {
        color: #172033;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
      }

      * {
        box-sizing: border-box;
      }

      .widget {
        width: min(${fullWidgetWidth}px, calc(100vw - 24px));
        border: 1px solid #bdd4dc;
        border-left: 4px solid #007c78;
        border-radius: 8px;
        background: linear-gradient(135deg, #ffffff 0%, #edf8f7 100%);
        box-shadow: 0 18px 45px rgba(6, 22, 47, 0.18);
        overflow: hidden;
      }

      .launcher {
        display: none;
        place-items: center;
        width: 56px;
        height: 56px;
        border: 1px solid #bdd4dc;
        border-left: 4px solid #007c78;
        border-radius: 8px;
        background: linear-gradient(135deg, #ffffff 0%, #edf8f7 100%);
        box-shadow: 0 14px 34px rgba(6, 22, 47, 0.2);
        cursor: move;
      }

      :host([data-autotime-minimized="true"]) .widget {
        display: none;
      }

      :host([data-autotime-minimized="true"]) .launcher {
        display: grid;
      }

      .handle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid #bdd4dc;
        cursor: move;
        user-select: none;
      }

      .brand-logo,
      .launcher-logo img {
        width: 28px;
        height: 28px;
        border: 1px solid #c9d4e6;
        border-radius: 6px;
        background: #ffffff;
        object-fit: contain;
      }

      .brand-mark {
        display: inline-grid;
        flex: 0 0 auto;
        place-items: center;
        width: 32px;
        height: 32px;
      }

      .launcher-logo,
      .icon-button {
        display: inline-grid;
        flex: 0 0 auto;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 7px;
        background: transparent;
        box-shadow: none;
        cursor: pointer;
      }

      .launcher-logo:hover,
      .icon-button:hover {
        background: #dff2f0;
      }

      .title-block {
        display: grid;
        flex: 1 1 auto;
        min-width: 0;
        gap: 1px;
      }

      .handle strong {
        color: #06162f;
        font-size: 13px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .handle span {
        color: #5b6475;
        font-size: 11px;
        font-weight: 600;
      }

      .window-controls {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        margin-left: auto;
      }

      .status-alert {
        display: grid;
        gap: 3px;
        margin: 10px 12px 0;
        padding: 10px 12px;
        border: 1px solid #8bcfc8;
        border-left: 4px solid #007c78;
        border-radius: 8px;
        background: #ecfffb;
        box-shadow: 0 8px 18px rgba(0, 108, 103, 0.16);
        color: #064e4a;
        font-size: 12.5px;
        font-weight: 700;
      }

      .status-alert small {
        color: #47716e;
        font-size: 11px;
        font-weight: 600;
      }

      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 10px;
        padding: 12px;
      }

      .panel {
        display: grid;
        align-content: start;
        gap: 10px;
        min-width: 0;
      }

      .eyebrow {
        margin: 0 0 3px;
        color: #006c67;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h3 {
        margin: 0;
        color: #06162f;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
      }

      ul {
        display: grid;
        gap: 7px;
        margin: 0;
        padding-left: 16px;
      }

      li {
        color: #172033;
        font-size: 12.5px;
        line-height: 1.45;
      }

      .empty-list {
        padding-left: 0;
        list-style: none;
      }

      .empty-list li,
      .deep,
      .detail-row,
      .upgrade-note {
        border: 1px solid #d6deeb;
        border-radius: 8px;
        background: #ffffff;
      }

      .empty-list li {
        padding: 9px;
        color: #4d5768;
        font-weight: 600;
      }

      .deep {
        display: grid;
        gap: 8px;
        padding: 9px;
      }

      .blurred {
        filter: blur(4px);
        pointer-events: none;
        user-select: none;
      }

      .upgrade-note {
        margin: 0;
        padding: 9px;
        color: #075c59;
        background: #edf8f7;
        font-size: 12.5px;
        font-weight: 600;
      }

      a {
        color: #005f5a;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .details {
        display: grid;
        gap: 8px;
        margin: 0;
      }

      .detail-row {
        display: grid;
        gap: 3px;
        min-width: 0;
        padding: 9px;
      }

      dt {
        color: #5b6475;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }

      dd {
        margin: 0;
        min-width: 0;
        color: #172033;
        font-size: 12.5px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .action {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 5px;
        padding: 0 12px 12px;
      }

      button {
        min-width: 116px;
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid #006c67;
        border-radius: 8px;
        background: #007c78;
        box-shadow: 0 6px 14px rgba(0, 108, 103, 0.18);
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0;
      }

      button:hover {
        border-color: #004f4b;
        background: #006c67;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.72;
      }

      button.icon-button,
      button.launcher-logo {
        min-width: 32px;
        min-height: 32px;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        color: #324054;
        font-size: 18px;
        line-height: 1;
      }

      button.icon-button {
        font-weight: 700;
      }

      button.icon-button:hover,
      button.launcher-logo:hover {
        border: 0;
        background: #dff2f0;
        color: #06162f;
      }

      .dashboard-button {
        justify-self: start;
        min-height: 34px;
        border-color: #bdd4dc;
        background: #ffffff;
        box-shadow: none;
        color: #075c59;
      }

      .dashboard-button:hover {
        border-color: #007c78;
        background: #edf8f7;
      }

      .track-copy {
        display: grid;
        justify-self: end;
        justify-items: end;
        gap: 5px;
      }
    </style>
    <section class="widget" aria-label="AutoTime job tracker">
      <div class="handle" data-autotime-drag-handle>
        <div class="brand-mark" aria-hidden="true">
          <img class="brand-logo" alt="" aria-hidden="true" src="${chrome.runtime.getURL("icons/128.png")}" />
        </div>
        <div class="title-block">
          <strong>AutoTime EU Apply</strong>
          <span>Drag to move</span>
        </div>
        <div class="window-controls" aria-label="Widget controls">
          <button class="icon-button" data-autotime-collapse-widget type="button" title="Close" aria-label="Close AutoTime widget">&times;</button>
        </div>
      </div>
      ${
        status
          ? `<div class="status-alert" role="alert" aria-live="assertive">${escapeHtml(status)}<small>${escapeHtml(statusHelp)}</small></div>`
          : ""
      }
      <div class="grid">
        <div class="panel">
          <div>
            <p class="eyebrow">Job insights</p>
            <h3>Basic insight</h3>
          </div>
          ${renderList(basicInsights, hasParsedDescription ? "" : "empty-list")}
          <div class="deep">
            <div>
              <p class="eyebrow">Deep insight</p>
              ${isProCustomer ? "<h3>Pro analysis</h3>" : ""}
            </div>
            ${
              shouldShowDeepInsightList
                ? renderList(deepInsights, isProCustomer ? "" : "blurred")
                : ""
            }
            ${
              isProCustomer
                ? hasParsedDescription
                  ? ""
                  : '<p class="upgrade-note">Deep analysis appears after a job description is parsed.</p>'
                : `<p class="upgrade-note">Deep matching, gaps and priority guidance are available after upgrading. <a href="${appUrl}/pricing" target="_blank" rel="noreferrer">Upgrade to Pro</a></p>`
            }
          </div>
        </div>
        <aside class="panel" aria-label="Job details">
          <div>
            <p class="eyebrow">Job details</p>
            <h3>Parsed from job board</h3>
          </div>
          <dl class="details">
            <div class="detail-row"><dt>Job title</dt><dd>${escapeHtml(jobTitle)}</dd></div>
            <div class="detail-row"><dt>Company</dt><dd>${escapeHtml(company)}</dd></div>
            <div class="detail-row"><dt>Location</dt><dd>${escapeHtml(location)}</dd></div>
            <div class="detail-row"><dt>Platform</dt><dd>${escapeHtml(platform)}</dd></div>
            <div class="detail-row"><dt>Source</dt><dd>${escapeHtml(source)}</dd></div>
            <div class="detail-row"><dt>Description</dt><dd>${escapeHtml(description)}</dd></div>
          </dl>
        </aside>
      </div>
      <div class="action">
        <button class="dashboard-button" data-autotime-open-dashboard type="button">OPEN DASHBOARD</button>
        <div class="track-copy">
          <button data-autotime-track-job type="button">TRACK JOB</button>
        </div>
      </div>
    </section>
    <section class="launcher" data-autotime-launcher aria-label="AutoTime widget minimized">
      <button class="launcher-logo" data-autotime-toggle-widget type="button" aria-label="Open AutoTime widget">
        <img alt="" aria-hidden="true" src="${chrome.runtime.getURL("icons/128.png")}" />
      </button>
    </section>
  `
}

async function saveDetectedJob(details: JobPageResponse | null) {
  if (!details?.url) {
    return "Open a visible job page, then try again."
  }

  const applications = await getApplications()

  if (hasApplicationWithUrl(applications, details.url)) {
    return "This job is already tracked."
  }

  await saveApplication(createApplicationRecord(details))
  return "Job tracked successfully."
}

function initializeMovableJobWidget() {
  if (document.getElementById(widgetHostId)) {
    return
  }

  const host = document.createElement("div")
  host.id = widgetHostId
  host.style.position = "fixed"
  host.style.zIndex = "2147483647"

  const storedPosition = getStoredWidgetPosition()
  const initialPosition = clampWidgetPosition(
    storedPosition?.left ??
      window.innerWidth - fullWidgetWidth - widgetRightOffset,
    storedPosition?.top ?? 92
  )
  host.style.left = `${initialPosition.left}px`
  host.style.top = `${initialPosition.top}px`

  const shadow = host.attachShadow({ mode: "open" })
  document.documentElement.append(host)

  let details = detectJobPage()
  let accountSession: AccountSession | null = null
  let isMinimized = false
  let status = ""
  host.dataset.autotimeMinimized = String(isMinimized)

  function toggleWidget() {
    isMinimized = !isMinimized
    host.dataset.autotimeMinimized = String(isMinimized)
    const current = host.getBoundingClientRect()
    const nextPosition = clampWidgetPosition(
      current.left,
      current.top,
      isMinimized ? minWidgetWidth : fullWidgetWidth,
      isMinimized ? minWidgetHeight : fullWidgetHeight
    )
    host.style.left = `${nextPosition.left}px`
    host.style.top = `${nextPosition.top}px`
    saveWidgetPosition(nextPosition.left, nextPosition.top)
  }

  function render() {
    host.dataset.autotimeMinimized = String(isMinimized)
    shadow.innerHTML = getWidgetMarkup({ accountSession, details, status })
    bindWidgetEvents(
      host,
      shadow,
      () => details,
      (nextStatus) => {
        status = nextStatus
        render()
      }
    )
  }

  shadow.addEventListener(widgetToggleEventName, (event) => {
    event.stopPropagation()
    toggleWidget()
  })

  void getAccountSession().then((session) => {
    accountSession = session
    render()
  })

  render()

  window.addEventListener("resize", () => {
    const current = host.getBoundingClientRect()
    const nextPosition = clampWidgetPosition(
      current.left,
      current.top,
      isMinimized ? minWidgetWidth : fullWidgetWidth,
      isMinimized ? minWidgetHeight : fullWidgetHeight
    )
    host.style.left = `${nextPosition.left}px`
    host.style.top = `${nextPosition.top}px`
  })

  setInterval(() => {
    const nextDetails = detectJobPage()

    if (
      nextDetails.url !== details.url ||
      nextDetails.roleTitle !== details.roleTitle ||
      nextDetails.company !== details.company ||
      nextDetails.location !== details.location ||
      nextDetails.jobDescription !== details.jobDescription
    ) {
      details = nextDetails
      render()
    }
  }, 2500)
}

function bindWidgetEvents(
  host: HTMLDivElement,
  shadow: ShadowRoot,
  getDetails: () => JobPageResponse | null,
  setStatus: (status: string) => void
) {
  const handle = shadow.querySelector<HTMLElement>("[data-autotime-drag-handle]")
  const launcher = shadow.querySelector<HTMLElement>("[data-autotime-launcher]")
  const collapseControls = Array.from(
    shadow.querySelectorAll<HTMLElement>("[data-autotime-collapse-widget]")
  )
  const trackButton = shadow.querySelector<HTMLButtonElement>(
    "[data-autotime-track-job]"
  )
  const dashboardButton = shadow.querySelector<HTMLButtonElement>(
    "[data-autotime-open-dashboard]"
  )

  const findWidgetControl = (event: Event) =>
    event
      .composedPath()
      .find(
        (element): element is Element =>
          typeof (element as Element).matches === "function" &&
          (element as Element).matches("[data-autotime-collapse-widget]")
      )

  const activateWidgetControl = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()

    shadow.dispatchEvent(new CustomEvent(widgetToggleEventName))
  }

  collapseControls.forEach((control) => {
    control.addEventListener("pointerdown", (event) => {
      event.stopPropagation()
    })

    control.addEventListener("click", (event) => {
      activateWidgetControl(event)
    })
  })

  const bindHandleDrag = (dragSurface: HTMLElement) => {
    dragSurface.addEventListener("pointerdown", (event) => {
      if (findWidgetControl(event)) {
        return
      }

      event.preventDefault()
      dragSurface.setPointerCapture(event.pointerId)

      const startRect = host.getBoundingClientRect()
      const startX = event.clientX
      const startY = event.clientY
      const offsetX = event.clientX - startRect.left
      const offsetY = event.clientY - startRect.top

      const onPointerMove = (moveEvent: PointerEvent) => {
        const hasMoved =
          Math.abs(moveEvent.clientX - startX) > 3 ||
          Math.abs(moveEvent.clientY - startY) > 3

        if (!hasMoved) {
          return
        }

        const nextPosition = clampWidgetPosition(
          moveEvent.clientX - offsetX,
          moveEvent.clientY - offsetY,
          startRect.width,
          startRect.height
        )
        host.style.left = `${nextPosition.left}px`
        host.style.top = `${nextPosition.top}px`
      }

      const onPointerUp = (upEvent: PointerEvent) => {
        dragSurface.releasePointerCapture(upEvent.pointerId)
        dragSurface.removeEventListener("pointermove", onPointerMove)
        dragSurface.removeEventListener("pointerup", onPointerUp)
        const nextRect = host.getBoundingClientRect()
        saveWidgetPosition(nextRect.left, nextRect.top)
      }

      dragSurface.addEventListener("pointermove", onPointerMove)
      dragSurface.addEventListener("pointerup", onPointerUp)
    })
  }

  const bindLauncherControl = (dragSurface: HTMLElement) => {
    let activePointerId: number | null = null
    let launcherWasDragged = false
    let startX = 0
    let startY = 0
    let offsetX = 0
    let offsetY = 0
    let startWidth = minWidgetWidth
    let startHeight = minWidgetHeight

    dragSurface.addEventListener("pointerdown", (event) => {
      event.stopPropagation()

      activePointerId = event.pointerId
      launcherWasDragged = false
      const startRect = host.getBoundingClientRect()
      startX = event.clientX
      startY = event.clientY
      offsetX = event.clientX - startRect.left
      offsetY = event.clientY - startRect.top
      startWidth = startRect.width
      startHeight = startRect.height

      try {
        dragSurface.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture can fail for synthetic events; normal clicks still work.
      }
    })

    dragSurface.addEventListener("pointermove", (moveEvent) => {
      if (activePointerId !== moveEvent.pointerId) {
        return
      }

      const hasMoved =
        Math.abs(moveEvent.clientX - startX) > 3 ||
        Math.abs(moveEvent.clientY - startY) > 3

      if (!hasMoved) {
        return
      }

      launcherWasDragged = true
      const nextPosition = clampWidgetPosition(
        moveEvent.clientX - offsetX,
        moveEvent.clientY - offsetY,
        startWidth,
        startHeight
      )
      host.style.left = `${nextPosition.left}px`
      host.style.top = `${nextPosition.top}px`
    })

    dragSurface.addEventListener("pointerup", (upEvent) => {
      if (activePointerId !== upEvent.pointerId) {
        return
      }

      try {
        dragSurface.releasePointerCapture(upEvent.pointerId)
      } catch {
        // Ignore capture release failures from non-browser-generated events.
      }

      const nextRect = host.getBoundingClientRect()
      saveWidgetPosition(nextRect.left, nextRect.top)
      activePointerId = null
    })

    dragSurface.addEventListener("pointercancel", () => {
      activePointerId = null
    })

    dragSurface.addEventListener("click", (event) => {
      event.preventDefault()
      event.stopPropagation()

      if (launcherWasDragged) {
        launcherWasDragged = false
        return
      }

      shadow.dispatchEvent(new CustomEvent(widgetToggleEventName))
    })
  }

  if (handle) {
    bindHandleDrag(handle)
  }

  if (launcher) {
    bindLauncherControl(launcher)
  }

  trackButton?.addEventListener("click", () => {
    trackButton.disabled = true
    setStatus("Tracking job...")

    void saveDetectedJob(getDetails())
      .then((nextStatus) => setStatus(nextStatus))
      .catch(() => setStatus("Could not track this job."))
  })

  dashboardButton?.addEventListener("click", () => {
    window.open(`${appUrl}/dashboard`, "_blank", "noopener,noreferrer")
  })
}

export function registerAutotimeContentScript() {
  initializeMovableJobWidget()

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
