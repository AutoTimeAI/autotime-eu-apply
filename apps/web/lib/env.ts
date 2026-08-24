/**
 * Typed accessors for environment values that are safe to read from client
 * code (public app URL/environment, Supabase public keys, analytics
 * config). Companion to the server-only ./env.server.ts, which holds the
 * equivalent accessors for values that must never reach a client bundle.
 * Every accessor here either returns validated data or throws
 * ConfigurationUnavailableError - never a silently-empty value - except
 * getAnalyticsEnv, which is deliberately optional.
 */
import { z } from "zod"
import { ConfigurationUnavailableError } from "./configuration-error.ts"

const requiredString = z.string().trim().min(1)

/** Validates `value` against `schema`, throwing ConfigurationUnavailableError(integration) if it fails. */
function requirePublic<T>(
  integration: string,
  schema: z.ZodType<T>,
  value: unknown,
): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new ConfigurationUnavailableError(integration)
  }
  return parsed.data
}

/** Returns the deployment environment name, defaulting to "development" when NEXT_PUBLIC_AUTOTIME_ENV is unset. Throws if it's set to something other than the three known values. */
export function getApplicationEnvironment():
  | "development"
  | "preview"
  | "production" {
  return requirePublic(
    "application environment",
    z.enum(["development", "preview", "production"]),
    process.env.NEXT_PUBLIC_AUTOTIME_ENV ?? "development",
  )
}

/** Returns the public Supabase anon key and project URL. Throws if either is missing or the URL is invalid. */
export function getSupabasePublicEnv(): { anonKey: string; url: string } {
  return {
    anonKey: requirePublic(
      "authentication",
      requiredString,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    url: requirePublic(
      "authentication",
      requiredString.url(),
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
  }
}

/** Returns the app's canonical public URL, throwing ConfigurationUnavailableError if it's missing, malformed, non-http(s), or carries embedded credentials. */
export function getCanonicalAppUrl(): URL {
  const value = requirePublic(
    "application URL",
    requiredString.url(),
    process.env.NEXT_PUBLIC_APP_URL,
  )
  const url = new URL(value)
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
    throw new ConfigurationUnavailableError("application URL")
  }
  return url
}

/**
 * Returns PostHog config if analytics is configured, or null if it's not -
 * unlike the other accessors here, this never throws, since analytics is
 * an optional feature rather than a required dependency. `host` defaults
 * to PostHog's EU cloud endpoint when NEXT_PUBLIC_POSTHOG_HOST is unset,
 * but a malformed host still causes this to return null even if a key is
 * present.
 */
export function getAnalyticsEnv(): { host: string; key: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""
  if (!key) return null

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.posthog.com"
  const parsedHost = z.string().url().safeParse(host)
  return parsedHost.success ? { host: parsedHost.data, key } : null
}

/** True if NODE_ENV is "production". Note this is NODE_ENV, not getApplicationEnvironment()'s NEXT_PUBLIC_AUTOTIME_ENV - a "preview" deploy may still report true here. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
