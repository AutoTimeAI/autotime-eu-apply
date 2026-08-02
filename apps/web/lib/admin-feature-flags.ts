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
