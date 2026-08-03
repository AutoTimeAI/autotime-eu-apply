import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleEnv } from "../env.server"
import type { Database } from "./types"

let adminClient: SupabaseClient<Database> | null = null

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
