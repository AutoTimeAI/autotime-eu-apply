import type { User } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "./env.ts"

export type RefreshResult =
  | { kind: "invalid" }
  | { kind: "unauthorised"; message: string }
  | {
      kind: "success"
      authToken: string
      refreshToken: string
      expiresAt: number
    }

type RefreshClient = {
  auth: {
    refreshSession(input: { refresh_token: string }): Promise<{
      data: {
        session: null | {
          access_token: string
          expires_at?: number
          expires_in: number
          refresh_token: string
          user?: User
        }
      }
      error: null | { message: string }
    }>
  }
}

export async function runSessionRefresh(
  input: unknown,
  clientFactory: (url: string, anonKey: string) => RefreshClient,
  now: () => number = Date.now,
): Promise<RefreshResult> {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof (input as { refreshToken?: unknown }).refreshToken !== "string" ||
    !(input as { refreshToken: string }).refreshToken.trim()
  ) return { kind: "invalid" }

  const refreshToken = (input as { refreshToken: string }).refreshToken.trim()
  const env = getSupabasePublicEnv()
  const { data, error } = await clientFactory(env.url, env.anonKey).auth.refreshSession({
    refresh_token: refreshToken,
  })
  if (error || !data.session)
    return {
      kind: "unauthorised",
      message: error?.message ?? "Could not refresh session. Sign in again.",
    }
  return {
    kind: "success",
    authToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt:
      (data.session.expires_at ??
        Math.floor(now() / 1000) + data.session.expires_in) * 1000,
  }
}
