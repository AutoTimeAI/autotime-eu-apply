import { AdminAuthorizationError } from "./admin-authorization-policy.ts"
import { isConfigurationUnavailableError } from "./configuration-error.ts"

export function getAdminPublicStatus(error: unknown, fallback = 500): number {
  if (isConfigurationUnavailableError(error)) return 503
  if (error instanceof AdminAuthorizationError) return error.status
  return fallback
}
