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

function getLinkedInJobId(url = "") {
  const directMatch = url.match(/\/jobs\/view\/(\d+)/i)
  const currentJobIdMatch = url.match(/[?&]currentJobId=(\d+)/i)

  return directMatch?.[1] ?? currentJobIdMatch?.[1] ?? ""
}

export function getJobPlatform(url = ""): JobPlatform {
  const hostname = getHostname(url)

  if (isHostname(hostname, "linkedin.com")) {
    return "LinkedIn"
  }

  if (isHostname(hostname, "greenhouse.io")) {
    return "Greenhouse"
  }

  if (isHostname(hostname, "lever.co")) {
    return "Lever"
  }

  if (isHostname(hostname, "myworkdayjobs.com")) {
    return "Workday"
  }

  if (isHostname(hostname, "ashbyhq.com")) {
    return "Ashby"
  }

  if (isHostname(hostname, "smartrecruiters.com")) {
    return "SmartRecruiters"
  }

  if (isHostname(hostname, "icims.com")) {
    return "iCIMS"
  }

  if (isHostname(hostname, "bamboohr.com")) {
    return "BambooHR"
  }

  if (isHostname(hostname, "teamtailor.com")) {
    return "Teamtailor"
  }

  if (isHostname(hostname, "recruitee.com")) {
    return "Recruitee"
  }

  if (isHostname(hostname, "jobvite.com")) {
    return "Jobvite"
  }

  if (isHostname(hostname, "personio.de") || isHostname(hostname, "personio.com")) {
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
