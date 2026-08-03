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

export function isValidAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoles.includes(value as AdminRole);
}
export function isValidAdminStatus(
  value: unknown,
): value is AdminMembership["status"] {
  return value === "active" || value === "suspended";
}
export function hasAdminPermission(
  membership: AdminMembership | null,
  permission: AdminPermission,
) {
  return Boolean(
    membership?.status === "active" &&
    rolePermissions[membership.role]?.includes(permission),
  );
}
