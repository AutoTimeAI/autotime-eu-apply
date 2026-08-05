import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabasePublicEnv } from "../env"
import type { Database } from "./types"

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
