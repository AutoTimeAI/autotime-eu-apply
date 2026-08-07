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
