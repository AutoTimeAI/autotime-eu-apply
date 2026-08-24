/** Legacy compatibility check for callers that only need baseline admin access. */
import "server-only";
import type { User } from "@supabase/supabase-js";
import { getAdminMembership, hasAdminPermission } from "./admin-authorization";
import { isTestAuthUserId } from "./test-auth";

/** @deprecated Prefer a permission-specific authorization check. */
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user || isTestAuthUserId(user.id)) return false;
  return hasAdminPermission(await getAdminMembership(user.id), "overview:read");
}
