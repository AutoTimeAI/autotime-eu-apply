export type JobPageDetails = {
  roleTitle: string
  company: string
  location: string
  url: string
  source: string
  pageTitle: string
}

type JobPageTextInput = {
  title?: string
  heading?: string
  company?: string
  location?: string
  url?: string
  source?: string
}

const fillerTitleParts = [
  "apply",
  "careers",
  "job",
  "jobs",
  "job details",
  "job opening",
  "job openings",
  "greenhouse",
  "lever",
  "linkedin",
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

function isUsefulTitlePart(value: string) {
  const text = cleanText(value).toLowerCase()

  return text !== "" && !fillerTitleParts.includes(text)
}

function parseTitle(title = "") {
  const cleanTitle = cleanText(title)
  const atMatch = cleanTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|-]\s*.+)?$/i)

  if (atMatch) {
    return {
      roleTitle: cleanText(atMatch[1]),
      company: cleanText(atMatch[2])
    }
  }

  const parts = cleanTitle
    .split(/\s+[|-]\s+/)
    .map(cleanText)
    .filter(isUsefulTitlePart)

  if (parts.length >= 2) {
    return {
      roleTitle: parts[0],
      company: parts[1]
    }
  }

  return {
    roleTitle: cleanTitle,
    company: ""
  }
}

export function inferJobPageDetails(
  input: JobPageTextInput
): JobPageDetails {
  // Prefer explicit page text over title parsing because job-board titles often
  // include branding, location, or generic words such as "Careers".
  const parsedTitle = parseTitle(input.title)
  const roleTitle = cleanText(input.heading) || parsedTitle.roleTitle
  const company = cleanText(input.company) || parsedTitle.company
  const url = cleanText(input.url)

  return {
    roleTitle,
    company,
    location: cleanText(input.location),
    url,
    source: cleanText(input.source) || getHostname(url),
    pageTitle: cleanText(input.title)
  }
}
