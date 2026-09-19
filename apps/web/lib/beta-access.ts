import "server-only";
import { createAdminClient } from "./supabase/admin";

/**
 * True if `userId` may use the product. A missing beta_access row (the
 * default for a brand-new signup - nothing inserts one automatically) is
 * treated the same as an explicit 'pending' row, so a new user is gated by
 * default rather than by omission. Fails closed: a lookup error also
 * returns false rather than silently granting access.
 */
export async function isBetaActive(userId: string): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("beta_access")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.status === "active";
  } catch (error: unknown) {
    console.error("beta_access_lookup_failed", {
      userId,
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
