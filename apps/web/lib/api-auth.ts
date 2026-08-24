/**
 * Resolves the authenticated user for an incoming API request, trying (in
 * order) the test-auth override, the Supabase session cookie, then a
 * Bearer token from the Authorization header. Exists as the single entry
 * point API routes use for "who is calling", so each route does not have
 * to reimplement the cookie-vs-bearer-token fallback itself.
 */
import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import type { AuthResult } from "./auth-result"
import { createServerClient } from "./supabase/server"
import type { Database } from "./supabase/types"
import { getTestAuthUser } from "./test-auth"
import {
  getBearerUser as readBearerUser,
  getCookieUser as readCookieUser,
} from "./request-auth"

/** Extracts the bearer token from an `Authorization: Bearer <token>` header, or null if absent/empty. */
function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")

  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token || null
}

type AuthClient = Pick<ReturnType<typeof createClient<Database>>, "auth">

/**
 * Resolves the user from the Supabase session cookie via ./request-auth,
 * with an injectable `clientFactory` for testing.
 */
export async function getCookieUser(
  clientFactory: typeof createServerClient = createServerClient,
): Promise<AuthResult> {
  return readCookieUser(clientFactory)
}

/**
 * Resolves the user from a raw bearer token via ./request-auth. Without an
 * injected `clientFactory`, builds a one-off Supabase client with session
 * persistence and auto-refresh disabled, since a bearer-token request is
 * stateless and should not attempt to write/refresh a session.
 */
export async function getBearerUser(
  token: string,
  clientFactory?: (url: string, anonKey: string) => AuthClient,
): Promise<AuthResult> {
  return readBearerUser(token, (url, anonKey) =>
    clientFactory
      ? clientFactory(url, anonKey)
      : createClient<Database>(url, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
  )
}

/**
 * Resolves the authenticated user for `request`: a test-auth user if one is
 * configured, else the session cookie user. Only when the cookie lookup
 * yields no user (whether because there is no session or because the
 * lookup itself errored) does it look for a Bearer token in the
 * Authorization header; if none is present, the original (errored) cookie
 * result is returned as-is rather than a generic "no auth" result.
 */
export async function getRequestUser(request: Request): Promise<AuthResult> {
  const testUser = getTestAuthUser()

  if (testUser) {
    return { error: null, user: testUser }
  }

  const cookieUser = await getCookieUser()

  if (cookieUser.user) {
    return cookieUser
  }

  const bearerToken = getBearerToken(request)

  if (!bearerToken) {
    return cookieUser
  }

  return getBearerUser(bearerToken)
}
