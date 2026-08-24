"use client"

// Browser-side Supabase client, authenticated with the public anon key and
// the signed-in user's session (persisted, auto-refreshed). Distinct from
// admin.ts (server-only, service-role key) and server.ts (per-request,
// cookie-based) in this directory — use this one in client components.
import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "../env"
import type { Database } from "./types"

let browserClient: SupabaseClient<Database> | null = null

/**
 * Returns a lazily-created, module-cached Supabase browser client (singleton
 * per browser tab/session, per `isSingleton: true`) using the public anon
 * key. Session persistence, auto token refresh, and URL session detection
 * (for OAuth redirects) are all enabled.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient
  }

  const env = getSupabasePublicEnv()
  browserClient = createSupabaseBrowserClient<Database>(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    isSingleton: true,
  })

  return browserClient
}
