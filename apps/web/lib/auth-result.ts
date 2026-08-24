/**
 * Defines the common AuthResult shape used across the auth helpers
 * (./api-auth, ./request-auth) and a shared adapter that normalizes a raw
 * Supabase `getUser()`-style call into it. Kept as its own tiny module so
 * every auth path returns an identically shaped result rather than each
 * one inventing its own error/user pairing.
 */
import type { User } from "@supabase/supabase-js"

export type AuthResult = { error: string | null; user: User | null }

/**
 * Calls `getUser` and normalizes the result: any error, or a missing user,
 * collapses to `{ error: "Unauthorised", user: null }`; otherwise returns
 * `{ error: null, user }`. The specific underlying error (if any) is
 * discarded in favor of the fixed "Unauthorised" message.
 */
export async function readAuthenticatedUser(
  getUser: () => Promise<{ data: { user: User | null }; error: unknown }>,
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await getUser()
  return error || !user
    ? { error: "Unauthorised", user: null }
    : { error: null, user }
}
