export function normalizeApplicationUrlKey(url: string) {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    parsed.pathname = parsed.pathname.replace(/\/+$/, "")
    return parsed.toString().replace(/\/$/, "").toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "")
  }
}
