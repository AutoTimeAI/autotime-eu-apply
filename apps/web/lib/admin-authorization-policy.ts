/**
 * Pure authorization-decision layer for admin actions: given a
 * (possibly-null) user and a (possibly-null) admin membership, decides
 * whether the action is allowed and throws a typed error if not. Kept free
 * of any actual user/membership lookup (that lives in
 * ./admin-authorization) so the authorization decision itself stays easy
 * to unit test and reason about independent of Supabase/session plumbing.
 */
import {
  hasAdminPermission,
  type AdminMembership,
  type AdminPermission,
} from "./admin-permissions.ts";

/**
 * Thrown when an admin action is denied. `status` distinguishes an
 * unauthenticated caller (401) from an authenticated caller lacking the
 * required permission (403), so route/page handlers can map it to the
 * right HTTP response or redirect target.
 */
export class AdminAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(message: "Unauthorised" | "Forbidden", status: 401 | 403) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

/**
 * Asserts that `membership` grants `permission`, throwing
 * AdminAuthorizationError("Forbidden", 403) if not. A null membership
 * (e.g. no admin row, or a suspended one) always fails this check. Returns
 * the membership unchanged on success for convenient chaining.
 */
export function requireAdminPermission(
  membership: AdminMembership | null,
  permission: AdminPermission,
) {
  if (!hasAdminPermission(membership, permission))
    throw new AdminAuthorizationError("Forbidden", 403);
  return membership;
}

/**
 * Full authorization flow for a request: throws
 * AdminAuthorizationError("Unauthorised", 401) if `user` is null, otherwise
 * looks up membership via the injected `getMembership` function and applies
 * requireAdminPermission. On success returns both the user and its
 * (non-null, permission-satisfying) membership.
 */
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