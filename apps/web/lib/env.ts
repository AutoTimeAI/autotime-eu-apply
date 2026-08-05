import { z } from "zod"
import { ConfigurationUnavailableError } from "./configuration-error.ts"

const requiredString = z.string().trim().min(1)

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

export function getAnalyticsEnv(): { host: string; key: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""
  if (!key) return null

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.posthog.com"
  const parsedHost = z.string().url().safeParse(host)
  return parsedHost.success ? { host: parsedHost.data, key } : null
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}
