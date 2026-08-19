import type { User } from "@supabase/supabase-js"

export function isTestAccountUser(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  return user?.app_metadata?.is_test_account === true
}
