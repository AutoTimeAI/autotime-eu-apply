const protectedRoutePrefixes = [
  "/admin",
  "/dashboard",
  "/diagnostics",
  "/api/admin",
  "/api/ai",
  "/api/diagnostics",
  "/api/stripe",
]
const publicRoutePrefixes = ["/", "/pricing", "/privacy", "/terms", "/auth", "/login"]

export function isProtectedPath(pathname: string): boolean {
  if (pathname === "/api/stripe/webhook" || pathname === "/admin/login") return false
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isPublicPath(pathname: string): boolean {
  return publicRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export async function authenticateProxyPath<T>(
  pathname: string,
  authenticate: () => Promise<T>,
): Promise<T | null> {
  if (isPublicPath(pathname)) return null
  return authenticate()
}

export function getUnauthenticatedRedirect(pathname: string, search = ""): string {
  const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login"
  return `${loginPath}?redirectTo=${encodeURIComponent(`${pathname}${search}`)}`
}

export function getProtectedProxyFailure(error: unknown): {
  body: string
  status: 503
} | null {
  return isConfigurationUnavailableError(error)
    ? { body: configurationUnavailableMessage, status: 503 }
    : null
}
import {
  configurationUnavailableMessage,
  isConfigurationUnavailableError,
} from "./configuration-error.ts"
