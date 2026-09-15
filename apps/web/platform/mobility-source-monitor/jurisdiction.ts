const legacyJurisdictionCodes: Readonly<Record<string, string>> = {
  france: "FR",
  germany: "DE",
  ireland: "IE",
  netherlands: "NL",
  "united kingdom": "GB",
}

export function resolveSourceJurisdictionCode(jurisdiction: unknown): string | null {
  if (typeof jurisdiction !== "string") return null
  const normalized = jurisdiction.trim()
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase()
  return legacyJurisdictionCodes[normalized.toLowerCase()] ?? null
}
