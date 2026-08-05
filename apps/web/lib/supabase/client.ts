"use client"

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabasePublicEnv } from "../env"
import type { Database } from "./types"

let browserClient: SupabaseClient<Database> | null = null

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
