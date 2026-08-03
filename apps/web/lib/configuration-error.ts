export class ConfigurationUnavailableError extends Error {
  readonly code = "CONFIGURATION_UNAVAILABLE"
  readonly integration: string

  constructor(integration: string, options?: ErrorOptions) {
    super("Required service configuration is unavailable", options)
    this.name = "ConfigurationUnavailableError"
    this.integration = integration
  }
}

export function isConfigurationUnavailableError(
  error: unknown,
): error is ConfigurationUnavailableError {
  return error instanceof ConfigurationUnavailableError
}

export const configurationUnavailableMessage =
  "This service is temporarily unavailable. Please try again later."

export function getConfigurationFailure(error: unknown): {
  error: string
  status: 503
} | null {
  return isConfigurationUnavailableError(error)
    ? { error: configurationUnavailableMessage, status: 503 }
    : null
}
