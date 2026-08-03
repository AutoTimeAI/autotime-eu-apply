import type { User } from "@supabase/supabase-js"
import { readAuthenticatedUser, type AuthResult } from "./auth-result.ts"
import { getSupabasePublicEnv } from "./env.ts"

type AuthClient = {
  auth: {
    getUser(token?: string): Promise<{
      data: { user: User | null }
      error: unknown
    }>
  }
}

export async function getCookieUser(
  clientFactory: () => Promise<AuthClient>,
): Promise<AuthResult> {
  const client = await clientFactory()
  return readAuthenticatedUser(() => client.auth.getUser())
}

export async function getBearerUser(
  token: string,
  clientFactory: (url: string, anonKey: string) => AuthClient,
): Promise<AuthResult> {
  const env = getSupabasePublicEnv()
  const client = clientFactory(env.url, env.anonKey)
  return readAuthenticatedUser(() => client.auth.getUser(token))
}
