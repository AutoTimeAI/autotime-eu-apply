import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { createServerClient } from "./supabase/server";
import { isConfigurationUnavailableError } from "./configuration-error";
import { getTestAuthUser, isTestAuthUserId } from "./test-auth";
import {
  authorizeAdminPrincipal,
} from "./admin-authorization-policy";
export {
  AdminAuthorizationError,
  authorizeAdminPrincipal,
  requireAdminPermission,
} from "./admin-authorization-policy";
export {
  adminPermissions,
  adminRoles,
  hasAdminPermission,
  isValidAdminRole,
  rolePermissions,
  type AdminMembership,
  type AdminPermission,
  type AdminRole,
} from "./admin-permissions";
import {
  hasAdminPermission,
  isValidAdminRole,
  isValidAdminStatus,
  type AdminMembership,
  type AdminPermission,
} from "./admin-permissions";

export type AdminPrincipal = { membership: AdminMembership; user: User };

export async function getAdminMembership(
  userId: string,
): Promise<AdminMembership | null> {
  if (isTestAuthUserId(userId)) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  )
    return null;
  try {
    const { data, error } = await createAdminClient()
      .from("admin_memberships")
      .select("user_id, role, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (
      !data ||
      !isValidAdminRole(data.role) ||
      !isValidAdminStatus(data.status) ||
      data.user_id !== userId
    )
      return null;
    return { role: data.role, status: data.status, userId: data.user_id };
  } catch (error) {
    if (isConfigurationUnavailableError(error)) throw error;
    throw new Error("Admin membership lookup failed.", { cause: error });
  }
}
async function getSessionUser() {
  const testUser = getTestAuthUser();
  if (testUser) return testUser;
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error ? null : user;
}
export async function requireAdminPrincipal(
  permission: AdminPermission,
): Promise<AdminPrincipal> {
  const testUser = getTestAuthUser();
  const user = testUser ?? (await getSessionUser());
  return authorizeAdminPrincipal(
    user,
    permission,
    testUser ? async () => null : getAdminMembership,
  );
}
export async function requireAdminRequest(
  _request: Request,
  permission: AdminPermission,
) {
  return requireAdminPrincipal(permission);
}
export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}
