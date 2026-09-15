import { createHash } from "node:crypto"
import type { SourceObservation } from "shared"

export const SOURCE_PARSER_VERSION = "official-content-v2"
export const SOURCE_NORMALIZER_VERSION = "official-text-v2"
const MAX_SOURCE_BYTES = 5_242_880
const MAX_SOURCE_REDIRECTS = 5
const SOURCE_FETCH_TIMEOUT_MS = 8_000
const supportedSourceContentTypes = new Set(["application/json", "application/xhtml+xml", "text/html", "text/plain"])

const hash = (value: string) => createHash("sha256").update(value).digest("hex")
export interface SourceRedirectHop { status: number; from: string; to: string }

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, canonicalizeJson(entry)]))
  }
  return value
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' }
  return value.replace(/&(?:#(\d+)|#x([a-f0-9]+)|([a-z]+));/gi, (entity, decimal: string | undefined, hexadecimal: string | undefined, name: string | undefined) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10))
    if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    return named[name?.toLowerCase() ?? ""] ?? entity
  })
}

export function normalizeOfficialSource(raw: string, contentType = "text/html"): string {
  if (contentType === "application/json") {
    try {
      return JSON.stringify(canonicalizeJson(JSON.parse(raw)))
    } catch {
      return ""
    }
  }
  if (contentType === "text/plain") return raw.normalize("NFKC").replace(/\s+/g, " ").trim()
  const primary = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    ?? raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? raw
  return decodeHtmlEntities(primary
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|nav|header|footer|aside|dialog|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
}

export function isAllowedOfficialSource(url: string, allowedHosts: Set<string>): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && allowedHosts.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

function provenanceUrl(url: URL): string {
  return `${url.origin}${url.pathname}`
}

async function fetchAllowedOfficialSource(url: string, allowedHosts: Set<string>, fetcher: typeof fetch): Promise<{ response: Response; redirectChain: SourceRedirectHop[] }> {
  let currentUrl = new URL(url)
  const signal = AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS)
  const redirectChain: SourceRedirectHop[] = []
  for (let redirectCount = 0; redirectCount <= MAX_SOURCE_REDIRECTS; redirectCount += 1) {
    if (!isAllowedOfficialSource(currentUrl.toString(), allowedHosts)) throw new Error("Official source host is not allowlisted")
    const response = await fetcher(currentUrl.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "AutoTimeSourceMonitor/1.0" },
      signal,
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, redirectChain }
    const location = response.headers.get("location")
    if (!location || redirectCount === MAX_SOURCE_REDIRECTS) throw new Error("Official source redirect could not be followed safely")
    const nextUrl = new URL(location, currentUrl)
    if (!isAllowedOfficialSource(nextUrl.toString(), allowedHosts)) throw new Error("Official source redirect host is not allowlisted")
    redirectChain.push({ status: response.status, from: provenanceUrl(currentUrl), to: provenanceUrl(nextUrl) })
    currentUrl = nextUrl
  }
  throw new Error("Official source redirect limit exceeded")
}

async function readSourceText(response: Response): Promise<string> {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let receivedBytes = 0
  let content = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    receivedBytes += value.byteLength
    if (receivedBytes > MAX_SOURCE_BYTES) {
      await reader.cancel()
      throw new Error("Official source exceeds the capture limit")
    }
    content += decoder.decode(value, { stream: true })
  }
  return content + decoder.decode()
}

function sourceContentType(response: Response): string {
  return response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "text/html"
}

function incompleteObservation(httpStatus: number): SourceObservation {
  return { available: true, httpStatus, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
}

export async function captureOfficialSource(
  url: string,
  allowedHosts: Set<string>,
  fetcher: typeof fetch = fetch,
): Promise<SourceObservation> {
  try {
    const { response } = await fetchAllowedOfficialSource(url, allowedHosts, fetcher)
    if (!response.ok) return { available: false, httpStatus: response.status, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
    if (!supportedSourceContentTypes.has(sourceContentType(response))) return incompleteObservation(response.status)
    const raw = await readSourceText(response)
    const normalized = normalizeOfficialSource(raw, sourceContentType(response))
    if (!normalized) return { available: true, httpStatus: response.status, rawSha256: hash(raw), normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
    return { available: true, httpStatus: response.status, rawSha256: hash(raw), normalizedSha256: hash(normalized), parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
  } catch {
    return { available: false, httpStatus: null, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
  }
}

export async function captureOfficialSourceArtifact(
  url: string,
  allowedHosts: Set<string>,
  fetcher: typeof fetch = fetch,
): Promise<{ observation: SourceObservation; content: string | null; contentType: string; language: string; redirectChain: SourceRedirectHop[] }> {
  try {
    const { response, redirectChain } = await fetchAllowedOfficialSource(url, allowedHosts, fetcher)
    if (!response.ok) return { observation: { available: false, httpStatus: response.status, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }, content: null, contentType: "text/plain", language: "und", redirectChain }
    const contentType = sourceContentType(response)
    if (!supportedSourceContentTypes.has(contentType)) return { observation: incompleteObservation(response.status), content: null, contentType, language: "und", redirectChain }
    const content = await readSourceText(response)
    const normalized = normalizeOfficialSource(content, contentType)
    return {
      observation: { available: true, httpStatus: response.status, rawSha256: hash(content), normalizedSha256: normalized ? hash(normalized) : null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION },
      content,
      contentType,
      language: response.headers.get("content-language")?.split(",")[0]?.trim().slice(0, 35) || "und",
      redirectChain,
    }
  } catch {
    return { observation: { available: false, httpStatus: null, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }, content: null, contentType: "text/plain", language: "und", redirectChain: [] }
  }
}
