export const unexpectedApiErrorMessage =
  "Request could not be completed. Reference the diagnostic ID if you contact support."

/** Keeps expected client errors useful while preventing internal 5xx detail disclosure. */
export function toPublicApiError(
  error: string | null,
  status: number,
): string | null {
  return status >= 500 && error ? unexpectedApiErrorMessage : error
}
