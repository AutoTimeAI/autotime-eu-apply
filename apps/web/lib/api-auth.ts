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

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")

  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token || null
}

type AuthClient = Pick<ReturnType<typeof createClient<Database>>, "auth">

export async function getCookieUser(
  clientFactory: typeof createServerClient = createServerClient,
): Promise<AuthResult> {
  return readCookieUser(clientFactory)
}

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
