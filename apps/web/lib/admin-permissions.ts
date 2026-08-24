/**
 * Defines the admin role/permission vocabulary and the role-to-permission
 * mapping (RBAC table) that the rest of the admin authorization stack is
 * built on. Kept dependency-free (no "server-only", no Supabase imports) so
 * both server code and pure policy logic can import it without pulling in
 * server-only or client-only concerns.
 */
export const adminRoles = ["owner", "admin", "support", "analyst"] as const;
export type AdminRole = (typeof adminRoles)[number];
export const adminPermissions = [
  "overview:read",
  "users:read",
  "users:read_email",
  "users:manage_beta",
  "feedback:read",
  "feedback:write",
  "ai_operations:read",
  "market_data:read",
  "market_data:refresh",
  "feature_flags:read",
  "feature_flags:write",
  "audit:read",
  "admin_memberships:manage",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];
export type AdminMembership = {
  role: AdminRole;
  status: "active" | "suspended";
  userId: string;
};

/**
 * The RBAC table itself: which permissions each admin role holds. `owner`
 * is granted every permission (the full `adminPermissions` list) rather
 * than an enumerated subset, so it automatically gains any newly added
 * permission without this table needing an update.
 */
export const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  owner: adminPermissions,
  admin: [
    "overview:read",
    "users:read",
    "users:read_email",
    "users:manage_beta",
    "feedback:read",
    "feedback:write",
    "ai_operations:read",
    "market_data:read",
    "market_data:refresh",
    "feature_flags:read",
    "audit:read",
  ],
  support: ["overview:read", "users:read", "feedback:read", "feedback:write"],
  analyst: [
    "overview:read",
    "feedback:read",
    "ai_operations:read",
    "market_data:read",
    "feature_flags:read",
  ],
};

/** Type guard: true if `value` is one of the known admin role strings. */
export function isValidAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoles.includes(value as AdminRole);
}
/** Type guard: true if `value` is a valid admin membership status. */
export function isValidAdminStatus(
  value: unknown,
): value is AdminMembership["status"] {
  return value === "active" || value === "suspended";
}
/**
 * Returns whether `membership` grants `permission`. A suspended membership
 * (status !== "active") never has any permission, regardless of role.
 */
export function hasAdminPermission(
  membership: AdminMembership | null,
  permission: AdminPermission,
) {
  return Boolean(
    membership?.status === "active" &&
    rolePermissions[membership.role]?.includes(permission),
  );
}
