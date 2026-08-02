import {
  hasAdminPermission,
  type AdminMembership,
  type AdminPermission,
} from "./admin-permissions.ts";

export class AdminAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(message: "Unauthorised" | "Forbidden", status: 401 | 403) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

export function requireAdminPermission(
  membership: AdminMembership | null,
  permission: AdminPermission,
) {
  if (!hasAdminPermission(membership, permission))
    throw new AdminAuthorizationError("Forbidden", 403);
  return membership;
}

export async function authorizeAdminPrincipal<TUser extends { id: string }>(
  user: TUser | null,
  permission: AdminPermission,
  getMembership: (userId: string) => Promise<AdminMembership | null>,
) {
  if (!user) throw new AdminAuthorizationError("Unauthorised", 401);
  const membership = await getMembership(user.id);
  requireAdminPermission(membership, permission);
  return { membership: membership!, user };
}