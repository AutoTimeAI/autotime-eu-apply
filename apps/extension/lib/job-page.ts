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

const namedEntities: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'"
}

// Decoding &amp; in a separate pass before &lt;/&gt;/etc. is a classic
// double-escaping bug: text that was legitimately double-escaped in the
// source page (e.g. a company name literally containing "&amp;", written
// in the page's HTML as "&amp;amp;") would decode in two passes into a
// bare "&" instead of staying "&amp;" - corrupting scraped job data (job
// title, company, location) with no relation to any real HTML tag.
// Matching every named entity in one pass avoids re-scanning content a
// prior replacement already produced.
function decodeNamedEntities(value: string): string {
  return value.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/gi, (match) => namedEntities[match.toLowerCase()] ?? match)
}

function cleanText(value = "") {
  return decodeNamedEntities(value.replace(/<[^>]*>/g, " "))
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

export function getJobPlatform(url = ""): JobPlatform {
  return getCoveragePlatform(url) ?? "Generic"
}

export function isLinkedInUrl(url = "") {
  return getJobPlatform(url) === "LinkedIn"
}

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

// A real job description is never anywhere near this long - this just
// bounds the cost of the unanchored regex scans below against a page that
// hands back an unexpectedly huge (or adversarially padded) description,
// matching the length-before-regex discipline used elsewhere in this file
// (isLikelyShortFieldValue/isLikelyLocationValue).
const MAX_LOCATION_SIGNAL_SCAN_LENGTH = 20000

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
