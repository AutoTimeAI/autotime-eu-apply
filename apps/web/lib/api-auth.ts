import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import { publicEnv } from "./env"
import { createServerClient } from "./supabase/server"
import type { Database } from "./supabase/types"

type AuthResult = {
  error: string | null
  user: User | null
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")

  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token || null
}

async function getCookieUser(): Promise<AuthResult> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { error: "Unauthorised", user: null }
    }

    return { error: null, user }
  } catch (error: unknown) {
    return { error: "Unauthorised", user: null }
  }
}

async function getBearerUser(token: string): Promise<AuthResult> {
  try {
    const supabase = createClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { error: "Unauthorised", user: null }
    }

    return { error: null, user }
  } catch (error: unknown) {
    return { error: "Unauthorised", user: null }
  }
}

export async function getRequestUser(request: Request): Promise<AuthResult> {
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
