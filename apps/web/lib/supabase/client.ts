"use client"

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { publicEnv } from "../env"
import type { Database } from "./types"

let browserClient: SupabaseClient<Database> | null = null

export function createBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient
  }

  browserClient = createSupabaseBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      isSingleton: true
    }
  )

  return browserClient
}
