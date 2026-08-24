/**
 * Maps an unknown error thrown from admin code into the HTTP status code
 * that is safe to expose to the client. Exists as its own tiny module so
 * both the JSON response builder (./admin-safe-response) and any other
 * admin error handling can share one policy for which errors get their own
 * status vs. falling back to a generic one.
 */
import { AdminAuthorizationError } from "./admin-authorization-policy.ts"
import { isConfigurationUnavailableError } from "./configuration-error.ts"

/**
 * Returns 503 for a configuration-unavailable error, the error's own
 * `status` (401/403) for an AdminAuthorizationError, or `fallback`
 * (default 500) for anything else.
 */
export function getAdminPublicStatus(error: unknown, fallback = 500): number {
  if (isConfigurationUnavailableError(error)) return 503
  if (error instanceof AdminAuthorizationError) return error.status
  return fallback
}
