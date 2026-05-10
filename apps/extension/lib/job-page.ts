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
  return value.replace(/\s+/g, " ").trim()
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
  return "LinkedIn form filling stays manual. AutoTime can import visible job details, but it will not auto-submit or fill LinkedIn applications."
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
  const roleTitle = cleanText(input.heading) || parsedTitle.roleTitle
  const company = cleanText(input.company) || parsedTitle.company

  return {
    roleTitle,
    company,
    location: cleanText(input.location),
    jobDescription: cleanText(input.description),
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
