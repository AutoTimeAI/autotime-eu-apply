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
// SSR of a "use client" component, so this rejects the same backslash/
// double-slash patterns by construction instead of resolving a real URL.
export function getClientSafeRedirectPath(
  value: string | null,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback
  }

  return value
}
