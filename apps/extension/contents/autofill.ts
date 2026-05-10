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

function clampWidgetPosition(left: number, top: number, width = 520, height = 420) {
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

function getJsonLdJobPosting() {
  const scripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]'
    )
  )

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? "") as
        | Record<string, unknown>
        | Record<string, unknown>[]
      const items = Array.isArray(parsed) ? parsed : [parsed]
      const posting = items.find((item) => item["@type"] === "JobPosting")

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
    const text = document.querySelector(selector)?.textContent?.trim()
    if (text) {
      return text
    }
  }

  return ""
}

function getJobDescription() {
  return getFirstText([
    ".jobs-description__content",
    ".jobs-box__html-content",
    ".jobs-description-content__text",
    ".show-more-less-html__markup",
    "[data-test-job-description]",
    "[data-testid='job-description']",
    "[data-ui='job-description']",
    "[data-automation-id='jobPostingDescription']",
    ".posting-description",
    ".job-description",
    "section.description"
  ])
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
  const jsonLdPosting = getJsonLdJobPosting()
  const jsonLdHiringOrganization = jsonLdPosting?.hiringOrganization as
    | { name?: string }
    | undefined
  const jsonLdLocation = jsonLdPosting?.jobLocation as
    | { address?: { addressLocality?: string; addressCountry?: string } }
    | { address?: { addressLocality?: string; addressCountry?: string } }[]
    | undefined
  const jsonLdAddress = Array.isArray(jsonLdLocation)
    ? jsonLdLocation[0]?.address
    : jsonLdLocation?.address
  const jsonLdLocationText = [
    jsonLdAddress?.addressLocality,
    jsonLdAddress?.addressCountry
  ]
    .filter(Boolean)
    .join(", ")

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
      ".jobs-unified-top-card__company-name",
      ".job-details-jobs-unified-top-card__company-name",
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
    ]) || getMetaContent(["og:site_name", "application-name"])
  const location =
    jsonLdLocationText ||
    getFirstText([
      ".jobs-unified-top-card__bullet",
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".topcard__flavor--bullet",
      ".posting-categories .location",
      ".location",
      "[data-testid='job-location']",
      "[data-testid='location']",
      "[data-ui='job-location']",
      "[class*='location']",
      "[data-automation-id='locations']",
      "[data-automation-id='job-details-location']"
    ]) || getLocationFromLinkedInDescription()

  const details = inferJobPageDetails({
    title: pageTitle,
    heading: getFirstText([
      ".jobs-unified-top-card__job-title",
      ".job-details-jobs-unified-top-card__job-title",
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
      (typeof jsonLdPosting?.description === "string"
        ? jsonLdPosting.description
        : "") || getJobDescription(),
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
        width: min(520px, calc(100vw - 24px));
        border: 1px solid #bdd4dc;
        border-left: 4px solid #007c78;
        border-radius: 8px;
        background: linear-gradient(135deg, #ffffff 0%, #edf8f7 100%);
        box-shadow: 0 18px 45px rgba(6, 22, 47, 0.18);
        overflow: hidden;
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

      .handle img {
        width: 28px;
        height: 28px;
        border: 1px solid #c9d4e6;
        border-radius: 6px;
        background: #ffffff;
        object-fit: contain;
      }

      .handle strong {
        color: #06162f;
        font-size: 13px;
        font-weight: 700;
      }

      .handle span {
        color: #5b6475;
        margin-left: auto;
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

      .status {
        grid-column: 1 / -1;
        justify-self: stretch;
        margin: 0;
        color: #14532d;
        font-size: 12px;
        font-weight: 700;
      }
    </style>
    <section class="widget" aria-label="AutoTime job tracker">
      <div class="handle" data-autotime-drag-handle>
        <img alt="" aria-hidden="true" src="${chrome.runtime.getURL("icons/128.png")}" />
        <strong>AutoTime EU Apply</strong>
        <span>Drag to move</span>
      </div>
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
        ${status ? `<p class="status" role="status">${escapeHtml(status)}</p>` : ""}
      </div>
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
  return "Job tracked."
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
    storedPosition?.left ?? window.innerWidth - 548,
    storedPosition?.top ?? 92
  )
  host.style.left = `${initialPosition.left}px`
  host.style.top = `${initialPosition.top}px`

  const shadow = host.attachShadow({ mode: "open" })
  document.documentElement.append(host)

  let details = detectJobPage()
  let accountSession: AccountSession | null = null
  let status = ""

  const render = () => {
    shadow.innerHTML = getWidgetMarkup({ accountSession, details, status })
    bindWidgetEvents(host, shadow, () => details, (nextStatus) => {
      status = nextStatus
      render()
    })
  }

  void getAccountSession().then((session) => {
    accountSession = session
    render()
  })

  render()

  window.addEventListener("resize", () => {
    const current = host.getBoundingClientRect()
    const nextPosition = clampWidgetPosition(current.left, current.top)
    host.style.left = `${nextPosition.left}px`
    host.style.top = `${nextPosition.top}px`
  })

  setInterval(() => {
    const nextDetails = detectJobPage()

    if (nextDetails.url !== details.url || nextDetails.jobDescription !== details.jobDescription) {
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
  const trackButton = shadow.querySelector<HTMLButtonElement>(
    "[data-autotime-track-job]"
  )
  const dashboardButton = shadow.querySelector<HTMLButtonElement>(
    "[data-autotime-open-dashboard]"
  )

  handle?.addEventListener("pointerdown", (event) => {
    event.preventDefault()
    handle.setPointerCapture(event.pointerId)

    const startRect = host.getBoundingClientRect()
    const offsetX = event.clientX - startRect.left
    const offsetY = event.clientY - startRect.top

    const onPointerMove = (moveEvent: PointerEvent) => {
      const next = clampWidgetPosition(
        moveEvent.clientX - offsetX,
        moveEvent.clientY - offsetY,
        startRect.width,
        startRect.height
      )
      host.style.left = `${next.left}px`
      host.style.top = `${next.top}px`
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      handle.releasePointerCapture(upEvent.pointerId)
      handle.removeEventListener("pointermove", onPointerMove)
      handle.removeEventListener("pointerup", onPointerUp)
      const nextRect = host.getBoundingClientRect()
      saveWidgetPosition(nextRect.left, nextRect.top)
    }

    handle.addEventListener("pointermove", onPointerMove)
    handle.addEventListener("pointerup", onPointerUp)
  })

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
