import type { User } from "@supabase/supabase-js"

export type AuthResult = { error: string | null; user: User | null }

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
