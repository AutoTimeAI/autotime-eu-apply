// Resolves a query-supplied redirect target against the actual request
// origin (not string prefix heuristics), since browsers and Node's URL
// parser both treat a leading "/\" the same as "//" - a path like
// "/\evil.example" resolves to "https://evil.example/", bypassing any
// check that only rejects a literal "//" prefix.
export function resolveSafeRedirectPath(
  requestUrl: URL,
  fallback = "/dashboard",
): string {
  const redirectTo = requestUrl.searchParams.get("redirectTo")

  if (!redirectTo?.startsWith("/")) {
    return fallback
  }

  let resolved: URL
  try {
    resolved = new URL(redirectTo, requestUrl.origin)
  } catch {
    return fallback
  }

  if (resolved.origin !== requestUrl.origin) {
    return fallback
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}

// Client-side counterpart: cannot resolve against window.location during
// SSR of a "use client" component, so this parses against a fixed dummy
// origin instead - the URL parser still applies the same tab/CR/LF-
// stripping and backslash-as-separator normalization it would against a
// real origin, so a value like "/\t/evil.example" (a literal tab, not the
// two-character escape) still resolves to a different origin and gets
// caught by the origin check below. A hand-rolled startsWith("/") /
// startsWith("//") / includes("\\") check previously missed this exact
// case, since the tab is stripped by the parser before those checks would
// ever see a "//" prefix.
const SAFE_REDIRECT_BASE = "https://autotime-safe-redirect.invalid"

export function getClientSafeRedirectPath(
  value: string | null,
  fallback = "/dashboard",
): string {
  if (!value) {
    return fallback
  }

  let resolved: URL
  try {
    resolved = new URL(value, SAFE_REDIRECT_BASE)
  } catch {
    return fallback
  }

  if (resolved.origin !== SAFE_REDIRECT_BASE) {
    return fallback
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
