// Parses raw signals from a job posting page (JSON-LD JobPosting data,
// page title, and free text) into a normalized JobPageDetails shape, and
// decides the "capture mode" policy that gates how much of a page this
// extension is allowed to read: `api-reference` (data comes from the
// aggregated feed, no scraping), `manual-only` (LinkedIn - never read
// automatically), or `selector-extraction` (safe to scrape visible DOM).
// Pure text-parsing/URL logic - no chrome.* APIs - shared by
// contents/autofill.ts (the live page) and sidepanel code (parsing a tab's
// title/URL when the content script isn't reachable).
import { detectATS, getCoveragePlatform, isApiCoveredJobUrl, type PlatformName } from "shared"

export type JobPageDetails = {
  roleTitle: string
  company: string
  location: string
  jobDescription: string
  url: string
  source: string
  platform: JobPlatform
  pageTitle: string
  salary?: string
  employmentType?: string
}

export type JobPlatform = PlatformName | "Generic"

export type JobCaptureMode = "api-reference" | "selector-extraction" | "manual-only"
/**
 * Decides how (or whether) this extension is allowed to read a job page at
 * `url`: LinkedIn is always `manual-only` (never scraped); URLs already
 * covered by the aggregated jobs feed are `api-reference` (Track Job saves
 * a lightweight reference instead of extracting page content); Workday/
 * iCIMS/unrecognized ATSes are `selector-extraction` (safe to scrape);
 * anything else recognized is `manual-only`. This is the policy gate that
 * `detectJobPage` (contents/autofill.ts) checks before touching the DOM.
 */
export function getJobCaptureMode(url = ""): JobCaptureMode {
  if (isLinkedInUrl(url)) return "manual-only"
  if (isApiCoveredJobUrl(url)) return "api-reference"
  const ats = detectATS(url)
  return ats === "workday" || ats === "icims" || ats === "unknown" ? "selector-extraction" : "manual-only"
}

type JobPageTextInput = {
  title?: string
  heading?: string
  company?: string
  location?: string
  description?: string
  employmentType?: string
  salary?: string
  url?: string
  source?: string
}

type StructuredJobPostingData = {
  company: string
  description: string
  employmentType: string
  location: string
  roleTitle: string
  salary: string
}

function cleanText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function getStructuredText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getStructuredText).find(Boolean) ?? ""
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "string") {
    return cleanText(value)
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const item = value as Record<string, unknown>
  return getStructuredText(item.name) || getStructuredText(item.value)
}

function getStructuredNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(getStructuredNodes)
  }

  if (!value || typeof value !== "object") {
    return []
  }

  const item = value as Record<string, unknown>

  return [
    item,
    ...getStructuredNodes(item["@graph"]),
    ...getStructuredNodes(item.itemListElement)
  ]
}

function hasStructuredType(item: Record<string, unknown>, type: string) {
  const itemType = item["@type"]

  return Array.isArray(itemType)
    ? itemType.includes(type)
    : itemType === type
}

function getStructuredAddressText(value: unknown): string {
  const item = Array.isArray(value) ? value[0] : value

  if (typeof item === "string") {
    return cleanText(item)
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
    getStructuredText(address.addressLocality),
    getStructuredText(address.addressRegion),
    getStructuredText(address.addressCountry)
  ]
    .filter(Boolean)
    .join(", ")
}

function getStructuredEmploymentType(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getStructuredEmploymentType).filter(Boolean).join(", ")
  }

  return getStructuredText(value)
}

function getStructuredSalaryText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(getStructuredSalaryText).find(Boolean) ?? ""
  }

  if (typeof value === "number" || typeof value === "string") {
    return getStructuredText(value)
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const item = value as Record<string, unknown>
  const nestedValue = item.value
  const valueRecord =
    typeof nestedValue === "object" && nestedValue !== null
      ? (nestedValue as Record<string, unknown>)
      : null
  const minValue = getStructuredText(valueRecord?.minValue ?? item.minValue)
  const maxValue = getStructuredText(valueRecord?.maxValue ?? item.maxValue)
  const directValue = getStructuredText(valueRecord?.value ?? nestedValue)
  const valueText =
    minValue && maxValue
      ? `${minValue}-${maxValue}`
      : directValue || minValue || maxValue
  const currency = getStructuredText(item.currency ?? valueRecord?.currency)
  const unitText = getStructuredText(valueRecord?.unitText ?? item.unitText)

  return [currency, valueText, unitText].filter(Boolean).join(" ")
}

/**
 * Finds the first schema.org `JobPosting` node inside a parsed JSON-LD
 * value (searching `@graph` and `itemListElement` arrays too) and extracts
 * its role title, company, location, salary, employment type, and
 * description into plain strings. Returns `null` if no JobPosting node is
 * found. This is the highest-priority source `detectJobPage` tries before
 * falling back to CSS selector heuristics, since structured data is far
 * less brittle than page-specific selectors.
 */
export function extractJobPostingFromJsonLd(
  value: unknown
): StructuredJobPostingData | null {
  const posting = getStructuredNodes(value).find((item) =>
    hasStructuredType(item, "JobPosting")
  )

  if (!posting) {
    return null
  }

  return {
    roleTitle: getStructuredText(posting.title),
    company: getStructuredText(posting.hiringOrganization),
    location:
      getStructuredAddressText(posting.jobLocation) ||
      getStructuredAddressText(posting.applicantLocationRequirements) ||
      (getStructuredText(posting.jobLocationType) === "TELECOMMUTE"
        ? "Remote"
        : getStructuredText(posting.jobLocationType)),
    salary: getStructuredSalaryText(posting.baseSalary),
    employmentType: getStructuredEmploymentType(posting.employmentType),
    description: getStructuredText(posting.description)
  }
}

function getHostname(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function getLinkedInJobId(url = "") {
  const directMatch = url.match(/\/jobs\/view\/(\d+)/i)
  const currentJobIdMatch = url.match(/[?&]currentJobId=(\d+)/i)

  return directMatch?.[1] ?? currentJobIdMatch?.[1] ?? ""
}

/** Identifies which known job board/ATS `url` belongs to (from the shared platform-coverage table), or `"Generic"` if unrecognized. */
export function getJobPlatform(url = ""): JobPlatform {
  return getCoveragePlatform(url) ?? "Generic"
}

/** True if `url` belongs to LinkedIn - gates the manual-only capture mode and the LinkedIn-specific consent flow in lib/match-overlay.ts. */
export function isLinkedInUrl(url = "") {
  return getJobPlatform(url) === "LinkedIn"
}

/**
 * Rewrites a LinkedIn job URL to its canonical `/jobs/view/{id}/` form
 * (extracting the id from either the path or a `currentJobId` query
 * param), so the same posting reached via a search results page or a
 * direct link normalizes to one URL for dedup purposes. Returns the
 * cleaned input unchanged if it isn't a LinkedIn URL or has no job id.
 */
export function getLinkedInCanonicalJobUrl(url = "") {
  if (!isLinkedInUrl(url)) {
    return cleanText(url)
  }

  try {
    const parsed = new URL(url)
    const linkedInJobId = getLinkedInJobId(url)

    if (linkedInJobId) {
      return `${parsed.origin}/jobs/view/${linkedInJobId}/`
    }
  } catch {
    return cleanText(url)
  }

  return cleanText(url)
}

/**
 * Parses a LinkedIn `<title>` of the form "Job Title | Company | ... |
 * LinkedIn" into `{ title, company }`. Returns both empty if the title
 * doesn't have at least 3 pipe-separated parts ending in "LinkedIn", or if
 * either extracted value fails the short-field plausibility check.
 */
export function parseLinkedInPageTitle(value = "") {
  const parts = value
    .split("|")
    .map((part) => cleanText(part))
    .filter(Boolean)

  if (
    parts.length < 3 ||
    !/^linkedin$/i.test(parts[parts.length - 1] ?? "")
  ) {
    return { company: "", title: "" }
  }

  const title = parts[0] ?? ""
  const company = parts[1] ?? ""

  return {
    company: isLikelyShortFieldValue(company, 8, 100) ? company : "",
    title: isLikelyShortFieldValue(title, 12, 120) ? title : ""
  }
}

export function getLinkedInManualInputMessage() {
  return "LinkedIn stays scoped: AutoTime can import visible job details and fill Easy Apply fields only when the modal is open, but will not auto-submit."
}

function cleanRoleTitle(value = "") {
  return cleanText(value)
    .replace(/^job application for\s+/i, "")
    .replace(/^job description\s*[:|-]\s*/i, "")
    .replace(/^job opening\s*[:|-]\s*/i, "")
    .replace(/^apply for\s+/i, "")
    .trim()
}

function cleanDetectedLocation(value = "") {
  if (isLikelyUrlNoise(value)) {
    return ""
  }

  return cleanText(value)
    .replace(
      /\s+(?:salary|compensation|about(?:\s+the\s+(?:opportunity|role|company))?|the\s+role|role|key\s+responsibilities|responsibilities|requirements|profile|what(?:'|’)s\s+on\s+offer|benefits|application|how\s+to\s+apply)\b.*$/i,
      ""
    )
    .replace(/[.;,:\-\s]+$/, "")
    .trim()
}

function isLikelyUrlNoise(value = "") {
  return /https?:\/\/|www\.|linkedin\.com|currentJobId=|%2f|%3a/i.test(value)
}

function isBlockedJobDetailValue(value = "") {
  const text = cleanText(value).toLowerCase()

  return (
    !text ||
    isLikelyUrlNoise(text) ||
    /^(not tracked yet|not detected|waiting|parsed from job board|job details|wide)$/i.test(
      text
    )
  )
}

function isLikelyShortFieldValue(value = "", maxWords = 12, maxLength = 120) {
  const text = cleanText(value)

  if (isBlockedJobDetailValue(text)) {
    return false
  }

  const words = text.split(/\s+/).filter(Boolean)

  if (words.length > maxWords || text.length > maxLength) {
    return false
  }

  if (
    /\b(?:salary|compensation|equity|responsibilities|requirements|send|cv|video|about the|working with|you will|we are|job description|key responsibilities)\b/i.test(
      text
    )
  ) {
    return false
  }

  return true
}

function isLikelyLocationValue(value = "") {
  const text = cleanDetectedLocation(value)

  if (isBlockedJobDetailValue(text)) {
    return false
  }

  const words = text.split(/\s+/).filter(Boolean)

  if (words.length > 10 || text.length > 90) {
    return false
  }

  if (
    /\b(?:salary|compensation|equity|opportunity|company|business|role|responsibilities|requirements|experience|application|apply|send|cv|video|about|working|supporting|generated|revenue|students|organisations|organization)\b/i.test(
      text
    )
  ) {
    return false
  }

  if (/[£$€]\s*\d|\b\d{2,3},\d{3}\b/.test(text)) {
    return false
  }

  return true
}

function getLikelyRoleTitle(value = "") {
  const roleTitle = cleanRoleTitle(value)

  return isLikelyShortFieldValue(roleTitle, 12, 120) ? roleTitle : ""
}

function getLikelyCompany(value = "") {
  const company = cleanText(value)

  return isLikelyShortFieldValue(company, 8, 100) ? company : ""
}

function getLikelyLocation(value = "") {
  const location = cleanDetectedLocation(value)

  return isLikelyLocationValue(location) ? location : ""
}

/**
 * Scans free-text job description content for a location signal, trying a
 * series of patterns (explicit "Location:"/"Office:"/"Based in ..." labels,
 * then "Remote/Hybrid/On-site in ...") in priority order and returning the
 * first plausible match (checked via isLikelyLocationValue). Returns `""`
 * if nothing plausible is found. Input is capped before regex evaluation to
 * keep untrusted, unusually large descriptions from causing excessive work.
 */
const MAX_LOCATION_SIGNAL_SCAN_LENGTH = 20_000

export function inferLocationSignalFromText(description = "") {
  const text = description
    .slice(0, MAX_LOCATION_SIGNAL_SCAN_LENGTH)
    .replace(/\r\n/g, "\n")
  const patterns = [
    /\bLocation\s*[:|-]\s*([A-Z][A-Za-z .'-]+,\s*(?:United Kingdom|UK|Ireland|Germany|France|Spain|Portugal|Italy|Netherlands|Belgium|Switzerland|Austria|Poland|Sweden|Norway|Denmark|Finland|Europe))(?:\s|$)/i,
    /\bLocation\s*[:|-]\s*([^\n<]+)/i,
    /\b[Ll]ocation\s+([A-Z][A-Za-z .'-]+(?:\s*\([^)]{2,80}\))?)/,
    /\bJob location\s*[:|-]\s*([^\n<]+)/i,
    /\bOffice\s*:\s*([^\n<]+)/i,
    /\bWorkplace\s*[:|-]\s*([^\n<]+)/i,
    /\bBase(?:d)?\s*:\s*([^\n<]+)/i,
    /\bBased in\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/i,
    /\b(?:Hybrid|Remote|On-site|Onsite)\s*(?:role|working)?\s*(?:in|from|-\s*)\s*([A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?)/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const location = cleanDetectedLocation(match?.[1])

    if (isLikelyLocationValue(location)) {
      return location
    }
  }

  return ""
}

/**
 * Normalizes already-extracted page text (title, heading, company,
 * location, description, salary, employment type, url, source) into a
 * final JobPageDetails record: cleans HTML/whitespace, plausibility-checks
 * role title/company/location against length and noise-word heuristics
 * (rejecting things like stray boilerplate or salary text mistaken for a
 * location), and falls back to scanning the description for a location
 * signal if none was directly detected. This is the last step both
 * `detectJobPage` (live page) and the side panel's tab-title fallback run
 * their raw inputs through.
 */
export function inferJobPageDetails(
  input: JobPageTextInput
): JobPageDetails {
  // Use actual structured or visible job fields only. Page titles are kept as
  // notes, but not split into guessed role/company values.
  const url = cleanText(input.url)
  const platform = getJobPlatform(url)
  const roleTitle = getLikelyRoleTitle(input.heading)
  const company = getLikelyCompany(input.company)
  const jobDescription = cleanText(input.description)
  const salary = cleanText(input.salary)
  const employmentType = cleanText(input.employmentType)
  const location =
    getLikelyLocation(input.location) || inferLocationSignalFromText(input.description)

  return {
    roleTitle,
    company,
    location,
    jobDescription,
    url,
    source: cleanText(input.source) || getHostname(url),
    platform,
    pageTitle: cleanText(input.title),
    ...(salary ? { salary } : {}),
    ...(employmentType ? { employmentType } : {})
  }
}

/** Formats the non-description JobPageDetails fields (location, salary, employment type, platform, source, page title) as one newline-joined notes block, appended to a tracked application's notes alongside the job description. */
export function formatJobPageNotes(details: JobPageDetails) {
  return [
    details.location && `Location: ${details.location}`,
    details.salary && `Salary: ${details.salary}`,
    details.employmentType && `Employment type: ${details.employmentType}`,
    details.platform !== "Generic" && `Platform: ${details.platform}`,
    details.source && `Source: ${details.source}`,
    details.pageTitle && `Page title: ${details.pageTitle}`
  ]
    .filter(Boolean)
    .join("\n")
}
