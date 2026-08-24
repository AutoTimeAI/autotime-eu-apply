/**
 * Defines the closed set of admin-managed feature flags, their safe
 * (fail-closed-friendly) defaults, and a reader that merges those defaults
 * with any per-environment override rows stored in Supabase. Kept separate
 * from the rest of admin data access since feature flags have their own
 * typed key vocabulary that other code (flag-gated features) may need to
 * import without pulling in unrelated admin modules.
 */
import "server-only"
import { createAdminClient } from "./supabase/admin"

export const adminFeatureFlagKeys = [
  "role_pathways_enabled",
  "nvidia_role_mapping_enabled",
  "market_refresh_enabled"
] as const

export type AdminFeatureFlagKey = (typeof adminFeatureFlagKeys)[number]

export const safeAdminFeatureFlagDefaults: Record<AdminFeatureFlagKey, boolean> = {
  role_pathways_enabled: true,
  nvidia_role_mapping_enabled: false,
  market_refresh_enabled: false
}

/** Type guard: true if `value` is one of the known admin feature flag keys. */
export function isAdminFeatureFlagKey(value: unknown): value is AdminFeatureFlagKey {
  return typeof value === "string" && adminFeatureFlagKeys.includes(value as AdminFeatureFlagKey)
}

export type AdminFeatureFlagOverride = {
  enabled: boolean
  environment: "development" | "preview" | "production"
  key: AdminFeatureFlagKey
  updatedAt: string
  version: number
}

/**
 * Reads the admin_feature_flags table and returns it alongside the safe
 * defaults, without merging them - callers combine `defaults` and
 * `overrides` themselves depending on which environment's override (if
 * any) should win. Throws if the query fails.
 */
export async function getAdminFeatureFlagsOverview(): Promise<{
  defaults: Record<AdminFeatureFlagKey, boolean>
  overrides: AdminFeatureFlagOverride[]
}> {
  const { data, error } = await createAdminClient()
    .from("admin_feature_flags")
    .select("key, enabled, environment, version, updated_at")
  if (error) throw new Error("feature_flags_source_unavailable")
  return {
    defaults: safeAdminFeatureFlagDefaults,
    overrides: (data ?? []).map((row) => ({
      enabled: row.enabled,
      environment: row.environment,
      key: row.key as AdminFeatureFlagKey,
      updatedAt: row.updated_at,
      version: row.version,
    })),
  }
}
