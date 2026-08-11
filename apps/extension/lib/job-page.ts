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

export type JobPlatform =
  | "LinkedIn"
  | "Stepstone"
  | "Indeed"
  | "EURES"
  | "EuroTechJobs"
  | "EuroJobs"
  | "NextLevelJobs"
  | "Wellfound"
  | "Xing"
  | "WelcomeToTheJungle"
  | "NationaleVacaturebank"
  | "InfoJobs"
  | "Monster"
  | "EuroTopTech"
  | "JobTeaser"
  | "Greenhouse"
  | "Lever"
  | "Workday"
  | "Ashby"
  | "SmartRecruiters"
  | "iCIMS"
  | "BambooHR"
  | "Teamtailor"
  | "Recruitee"
  | "Jobvite"
  | "Personio"
  | "Generic"

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

function isHostname(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function isIndeedHostname(hostname: string) {
  return isHostname(hostname, "indeed.com") || /^indeed\.[a-z.]+$/i.test(hostname)
}

function getLinkedInJobId(url = "") {
  const directMatch = url.match(/\/jobs\/view\/(\d+)/i)
  const currentJobIdMatch = url.match(/[?&]currentJobId=(\d+)/i)

  return directMatch?.[1] ?? currentJobIdMatch?.[1] ?? ""
}

export function getJobPlatform(url = ""): JobPlatform {
  const hostname = getHostname(url)
  const ats = detectATS(url)

  if (isHostname(hostname, "linkedin.com")) {
    return "LinkedIn"
  }

  if (isHostname(hostname, "stepstone.de") || isHostname(hostname, "stepstone.com")) {
    return "Stepstone"
  }

  if (isIndeedHostname(hostname)) {
    return "Indeed"
  }

  if (isHostname(hostname, "eures.europa.eu") || isHostname(hostname, "eures.ec.europa.eu")) {
    return "EURES"
  }

  if (isHostname(hostname, "eurotechjobs.com")) {
    return "EuroTechJobs"
  }

  if (isHostname(hostname, "eurojobs.com")) {
    return "EuroJobs"
  }

  if (isHostname(hostname, "nextleveljobs.eu")) {
    return "NextLevelJobs"
  }

  if (isHostname(hostname, "wellfound.com") || isHostname(hostname, "angel.co")) {
    return "Wellfound"
  }

  if (isHostname(hostname, "xing.com")) {
    return "Xing"
  }

  if (isHostname(hostname, "welcometothejungle.com")) {
    return "WelcomeToTheJungle"
  }

  if (isHostname(hostname, "nationalevacaturebank.nl")) {
    return "NationaleVacaturebank"
  }

  if (isHostname(hostname, "infojobs.net") || isHostname(hostname, "infojobs.it")) {
    return "InfoJobs"
  }

  if (
    isHostname(hostname, "monster.com") ||
    isHostname(hostname, "monster.co.uk") ||
    isHostname(hostname, "monster.de") ||
    isHostname(hostname, "monster.fr")
  ) {
    return "Monster"
  }

  if (isHostname(hostname, "eurotoptech.com")) {
    return "EuroTopTech"
  }

  if (isHostname(hostname, "jobteaser.com")) {
    return "JobTeaser"
  }

  if (ats === "greenhouse") {
    return "Greenhouse"
  }

  if (ats === "lever") {
    return "Lever"
  }

  if (ats === "workday") {
    return "Workday"
  }

  if (ats === "ashby") {
    return "Ashby"
  }

  if (ats === "smartrecruiters") {
    return "SmartRecruiters"
  }

  if (ats === "icims") {
    return "iCIMS"
  }

  if (isHostname(hostname, "bamboohr.com")) {
    return "BambooHR"
  }

  if (ats === "teamtailor") {
    return "Teamtailor"
  }

  if (ats === "recruitee") {
    return "Recruitee"
  }

  if (isHostname(hostname, "jobvite.com")) {
    return "Jobvite"
  }

  if (ats === "personio") {
    return "Personio"
  }

  return "Generic"
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

export function inferLocationSignalFromText(description = "") {
  const text = description.replace(/\r\n/g, "\n")
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
import { detectATS, isApiCoveredJobUrl } from "shared"
