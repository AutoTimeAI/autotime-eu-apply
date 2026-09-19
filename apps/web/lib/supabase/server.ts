// Per-request Supabase client for Next.js server contexts (route handlers,
// server components), authenticated via the incoming request's cookies with
// the public anon key — so it runs under the signed-in user's RLS policies,
// unlike admin.ts's service-role client in this directory. Not cached
// module-wide like client.ts/admin.ts since it's bound to per-request
// cookies and must be created fresh each time.
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"
import { getSupabasePublicEnv } from "../env"
import type { Database } from "./types"

export type PendingCookie = { name: string; value: string; options: CookieOptions }

/**
 * Writes every captured cookie onto `response` directly (via its own
 * `response.cookies.set()`), not through the ambient `next/headers` cookie
 * store. Needed because Next.js does not reliably merge cookies mutated via
 * `cookies().set()` onto a separately-constructed `NextResponse.redirect()`
 * returned from a Route Handler - a documented App Router limitation
 * (https://github.com/vercel/next.js/discussions/48434), confirmed here via
 * production diagnostics showing the write itself always succeeded (logged,
 * sane cookie attributes) while the browser's very next request still had
 * no session. `response.cookies.set()` is the one path Next.js guarantees
 * attaches to that exact response regardless of its type. Any caller that
 * signs a user in and then redirects must call this on its final response;
 * callers returning `NextResponse.json()`/`NextResponse.next()` don't need
 * this - the ambient merge already works for those.
 */
export function applyPendingCookies(
  response: NextResponse,
  pendingCookies: PendingCookie[],
): NextResponse {
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}

/**
 * Creates a Supabase client bound to the current request's cookies (reading
 * the session, and writing refreshed auth cookies back via `setAll`).
 * The `setAll` cookie write is wrapped in try/catch because Next.js throws
 * when cookies are set from a Server Component (not a Route Handler or
 * Server Action) — that failure is swallowed since middleware is expected to
 * refresh the session in that case, not this call.
 *
 * `onCookiesSet`, if given, receives every cookie `setAll` writes, in
 * addition to (not instead of) the normal ambient write - pass it when the
 * caller will end up returning `NextResponse.redirect(...)` and needs to
 * carry those cookies onto that exact response via `applyPendingCookies`.
 */
export async function createServerClient(
  onCookiesSet?: (cookies: PendingCookie[]) => void,
): Promise<SupabaseClient<Database>> {
  try {
    const cookieStore = await cookies()

    const env = getSupabasePublicEnv()
    return createSupabaseServerClient<Database>(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          onCookiesSet?.(cookiesToSet)

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
