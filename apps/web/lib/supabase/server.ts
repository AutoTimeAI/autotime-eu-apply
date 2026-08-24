// Per-request Supabase client for Next.js server contexts (route handlers,
// server components), authenticated via the incoming request's cookies with
// the public anon key — so it runs under the signed-in user's RLS policies,
// unlike admin.ts's service-role client in this directory. Not cached
// module-wide like client.ts/admin.ts since it's bound to per-request
// cookies and must be created fresh each time.
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabasePublicEnv } from "../env"
import type { Database } from "./types"

/**
 * Creates a Supabase client bound to the current request's cookies (reading
 * the session, and writing refreshed auth cookies back via `setAll`).
 * The `setAll` cookie write is wrapped in try/catch because Next.js throws
 * when cookies are set from a Server Component (not a Route Handler or
 * Server Action) — that failure is swallowed since middleware is expected to
 * refresh the session in that case, not this call.
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  try {
    const cookieStore = await cookies()

    const env = getSupabasePublicEnv()
    return createSupabaseServerClient<Database>(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error: unknown) {
            if (error instanceof Error) {
              return
            }

            throw new Error("Unable to set Supabase auth cookies")
          }
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error) throw error
    throw new Error("Unable to create Supabase server client", {
      cause: error,
    })
  }
}
