/**
 * Defines a distinct error type for "a required integration's configuration
 * (env var, secret, etc.) is missing" so callers throughout the app can
 * distinguish that specific, typically-503-worthy failure mode from a
 * generic runtime error, and map it to one consistent user-facing message.
 */
export class ConfigurationUnavailableError extends Error {
  readonly code = "CONFIGURATION_UNAVAILABLE"
  readonly integration: string

  constructor(integration: string, options?: ErrorOptions) {
    super("Required service configuration is unavailable", options)
    this.name = "ConfigurationUnavailableError"
    this.integration = integration
  }
}

/** Type guard: true if `error` is a ConfigurationUnavailableError. */
export function isConfigurationUnavailableError(
  error: unknown,
): error is ConfigurationUnavailableError {
  return error instanceof ConfigurationUnavailableError
}

export const configurationUnavailableMessage =
  "This service is temporarily unavailable. Please try again later."

/**
 * Returns the standard `{ error, status: 503 }` shape if `error` is a
 * ConfigurationUnavailableError, or null otherwise - lets a route handler
 * short-circuit with `getConfigurationFailure(error) ?? <normal handling>`.
 */
export function getConfigurationFailure(error: unknown): {
  error: string
  status: 503
} | null {
  return isConfigurationUnavailableError(error)
    ? { error: configurationUnavailableMessage, status: 503 }
    : null
}
