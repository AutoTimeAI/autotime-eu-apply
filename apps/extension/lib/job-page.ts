export type JobPageDetails = {
  roleTitle: string
  company: string
  location: string
  jobDescription: string
  url: string
  source: string
  platform: JobPlatform
  pageTitle: string
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
  url?: string
  source?: string
}

const fillerTitleParts = [
  "apply",
  "careers",
  "job",
  "job application",
  "jobs",
  "job description",
  "job details",
  "job opening",
  "job openings",
  "greenhouse",
  "jobvite",
  "lever",
  "linkedin",
  "personio",
  "recruitee",
  "smartrecruiters",
  "teamtailor",
  "workday"
]

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

export function getLinkedInManualInputMessage() {
  return "LinkedIn stays manual: AutoTime can import visible job details, but will not auto-submit or fill applications."
}

function isUsefulTitlePart(value: string) {
  const text = cleanText(value).toLowerCase()

  return text !== "" && !fillerTitleParts.includes(text)
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
  return cleanText(value)
    .replace(
      /\s+(?:salary|compensation|about(?:\s+the\s+(?:opportunity|role|company))?|the\s+role|role|key\s+responsibilities|responsibilities|requirements|profile|what(?:'|’)s\s+on\s+offer|benefits|application|how\s+to\s+apply)\b.*$/i,
      ""
    )
    .replace(/[.;,:\-\s]+$/, "")
    .trim()
}

function isLikelyShortFieldValue(value = "", maxWords = 12, maxLength = 120) {
  const text = cleanText(value)

  if (!text) {
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

  if (!text) {
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

  if (/\bremote\b/i.test(text) && /\b(?:uk|united kingdom)\b/i.test(text)) {
    return "United Kingdom"
  }

  if (/\bremote\b/i.test(text) && /\b(?:eu|europe|european union)\b/i.test(text)) {
    return "Europe"
  }

  return ""
}

function parseTitle(title = "", platform: JobPlatform = "Generic") {
  const cleanTitle = cleanRoleTitle(title)
  const atMatch = cleanTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|-]\s*.+)?$/i)

  if (atMatch) {
    return {
      roleTitle: cleanRoleTitle(atMatch[1]),
      company: cleanText(atMatch[2])
    }
  }

  const parts = cleanTitle
    .split(/\s+[|-]\s+/)
    .map(cleanText)
    .filter(isUsefulTitlePart)

  if (platform === "Lever" && parts.length >= 2) {
    return {
      roleTitle: cleanRoleTitle(parts[1]),
      company: parts[0]
    }
  }

  if (parts.length >= 2) {
    return {
      roleTitle: cleanRoleTitle(parts[0]),
      company: parts[1]
    }
  }

  return {
    roleTitle: cleanRoleTitle(cleanTitle),
    company: ""
  }
}

export function inferJobPageDetails(
  input: JobPageTextInput
): JobPageDetails {
  // Prefer explicit page text over title parsing because job-board titles often
  // include branding, location, or generic words such as "Careers".
  const url = cleanText(input.url)
  const platform = getJobPlatform(url)
  const parsedTitle = parseTitle(input.title, platform)
  const roleTitle =
    getLikelyRoleTitle(input.heading) || getLikelyRoleTitle(parsedTitle.roleTitle)
  const company =
    getLikelyCompany(input.company) || getLikelyCompany(parsedTitle.company)
  const jobDescription = cleanText(input.description)
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
    pageTitle: cleanText(input.title)
  }
}

export function formatJobPageNotes(details: JobPageDetails) {
  return [
    details.location && `Location: ${details.location}`,
    details.platform !== "Generic" && `Platform: ${details.platform}`,
    details.source && `Source: ${details.source}`,
    details.pageTitle && `Page title: ${details.pageTitle}`
  ]
    .filter(Boolean)
    .join("\n")
}
