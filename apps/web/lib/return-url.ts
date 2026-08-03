import "server-only"
import { getCanonicalAppUrl } from "./env.ts"

export class InvalidReturnUrlError extends Error {
  constructor() {
    super("Invalid return URL")
    this.name = "InvalidReturnUrlError"
  }
}

export function resolveReturnUrl(value: string): string {
  const canonical = getCanonicalAppUrl()
  if (value.startsWith("//") || !value.trim()) throw new InvalidReturnUrlError()

  let resolved: URL
  try {
    resolved = value.startsWith("/")
      ? new URL(value, canonical.origin)
      : new URL(value)
  } catch {
    throw new InvalidReturnUrlError()
  }

  if (
    (resolved.protocol !== "http:" && resolved.protocol !== "https:") ||
    resolved.origin !== canonical.origin ||
    resolved.username ||
    resolved.password
  ) {
    throw new InvalidReturnUrlError()
  }
  return resolved.toString()
}
