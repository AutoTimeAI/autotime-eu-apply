import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type CloudSyncEnv = {
  enabled: string | undefined
  supabaseUrl: string | undefined
  supabaseAnonKey: string | undefined
}

export type CloudSyncReadiness = {
  enabled: boolean
  configured: boolean
  modeLabel: "Local only" | "Flagged" | "Ready for auth wiring"
  accountLabel: "Sign-in locked" | "Auth wiring ready"
  syncActionLabel: "Keep local evidence" | "Connect account next"
  firstSliceLabel: "Profile first"
  safetyLabel: "No secrets"
  issues: string[]
}

export type CloudSyncClientResult =
  | {
      ready: true
      client: SupabaseClient
      readiness: CloudSyncReadiness
    }
  | {
      ready: false
      client: null
      readiness: CloudSyncReadiness
    }

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0
}

export function getCloudSyncReadiness(
  env: CloudSyncEnv
): CloudSyncReadiness {
  const enabled = env.enabled === "true"
  const issues = [
    !enabled && "cloud sync feature flag is off",
    !hasValue(env.supabaseUrl) && "Supabase URL is missing",
    !hasValue(env.supabaseAnonKey) && "Supabase anon key is missing"
  ].filter(Boolean) as string[]
  const configured = issues.length === 0

  return {
    enabled,
    configured,
    modeLabel: configured
      ? "Ready for auth wiring"
      : enabled
        ? "Flagged"
        : "Local only",
    accountLabel: configured ? "Auth wiring ready" : "Sign-in locked",
    syncActionLabel: configured ? "Connect account next" : "Keep local evidence",
    firstSliceLabel: "Profile first",
    safetyLabel: "No secrets",
    issues
  }
}

export function createCloudSyncClient(env: CloudSyncEnv): CloudSyncClientResult {
  const readiness = getCloudSyncReadiness(env)

  if (!readiness.configured) {
    return {
      ready: false,
      client: null,
      readiness
    }
  }

  return {
    ready: true,
    client: createClient(env.supabaseUrl ?? "", env.supabaseAnonKey ?? "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }),
    readiness
  }
}

export function getBrowserCloudSyncReadiness() {
  return getCloudSyncReadiness({
    enabled: process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}

export function createBrowserCloudSyncClient() {
  return createCloudSyncClient({
    enabled: process.env.NEXT_PUBLIC_AUTOTIME_CLOUD_SYNC_ENABLED,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })
}
