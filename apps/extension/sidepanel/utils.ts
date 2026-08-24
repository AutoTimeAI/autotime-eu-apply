// Small formatting/parsing helpers shared across side panel components.
/** Extracts the hostname from `url` (dropping a leading "www."), or `""` if `url` doesn't parse. */
export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

/**
 * Normalizes a URL for dedup comparisons (strips hash, lowercases
 * hostname, drops trailing slash). Note: this is a near-duplicate of
 * `normalizeApplicationUrl` in lib/applications.ts, which additionally
 * lowercases the whole result and strips a trailing slash from the
 * pathname before stringifying - the two are not guaranteed to produce
 * identical keys for the same input.
 */
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

/** Maps an OAuth/sign-in provider id ("github"/"google"/"email") to its display label, passing unrecognized values through unchanged. */
export function formatProviderLabel(provider: string): string {
  switch (provider) {
    case "github":
      return "GitHub"
    case "google":
      return "Google"
    case "email":
      return "Email sign-in"
    default:
      return provider
  }
}

export function getStatusClassName(message: string) {
  return message.startsWith("Complete ") || message.startsWith("Could not ")
    ? "status-message status-message-error"
    : "status-message"
}
