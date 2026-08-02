import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServerEnv } from "../env"
import type { Database } from "./types"

let adminClient: SupabaseClient<Database> | null = null

export function createAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client cannot be used in the browser")
  }

  if (adminClient) {
    return adminClient
  }

  const serverEnv = getServerEnv()

  adminClient = createClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )

  return adminClient
}
