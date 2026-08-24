// Server-only Supabase client authenticated with the service-role key, which
// bypasses row-level security. Distinct from client.ts (browser, anon key)
// and server.ts (per-request, anon key + user cookies) in this directory —
// use this one only for privileged operations (e.g. admin routes, webhooks)
// that must act outside a specific user's RLS-scoped session.
import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleEnv } from "../env.server"
import type { Database } from "./types"

let adminClient: SupabaseClient<Database> | null = null

/**
 * Returns a lazily-created, module-cached Supabase client using the service-role
 * key (bypasses RLS). Throws if called from the browser. Session persistence
 * and auto token refresh are disabled since the service role doesn't have a
 * user session.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client cannot be used in the browser")
  }

  if (adminClient) {
    return adminClient
  }

  const env = getSupabaseServiceRoleEnv()

  adminClient = createClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminClient
}
