import { createHash } from "node:crypto"
import type { SourceObservation } from "shared"

export const SOURCE_PARSER_VERSION = "official-html-text-v1"
export const SOURCE_NORMALIZER_VERSION = "official-text-v1"
const MAX_SOURCE_BYTES = 5_242_880
const MAX_SOURCE_REDIRECTS = 5
const SOURCE_FETCH_TIMEOUT_MS = 8_000

const hash = (value: string) => createHash("sha256").update(value).digest("hex")
export interface SourceRedirectHop { status: number; from: string; to: string }

export function normalizeOfficialSource(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
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

export async function captureOfficialSource(
  url: string,
  allowedHosts: Set<string>,
  fetcher: typeof fetch = fetch,
): Promise<SourceObservation> {
  try {
    const { response } = await fetchAllowedOfficialSource(url, allowedHosts, fetcher)
    if (!response.ok) return { available: false, httpStatus: response.status, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }
    const raw = await readSourceText(response)
    const normalized = normalizeOfficialSource(raw)
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
    const content = await readSourceText(response)
    const normalized = normalizeOfficialSource(content)
    return {
      observation: { available: true, httpStatus: response.status, rawSha256: hash(content), normalizedSha256: normalized ? hash(normalized) : null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION },
      content,
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "text/html",
      language: response.headers.get("content-language")?.split(",")[0]?.trim().slice(0, 35) || "und",
      redirectChain,
    }
  } catch {
    return { observation: { available: false, httpStatus: null, rawSha256: null, normalizedSha256: null, parserVersion: SOURCE_PARSER_VERSION, normalizerVersion: SOURCE_NORMALIZER_VERSION }, content: null, contentType: "text/plain", language: "und", redirectChain: [] }
  }
}
