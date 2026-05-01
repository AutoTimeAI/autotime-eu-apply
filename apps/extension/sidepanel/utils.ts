export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export function normalizeApplicationUrl(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString().replace(/\/$/, "")
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}

export function formatCreatedDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
}

export function getStatusClassName(message: string) {
  return message.startsWith("Complete ") || message.startsWith("Could not ")
    ? "status-message status-message-error"
    : "status-message"
}
