import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { publicEnv } from "../env"
import type { Database } from "./types"

export async function createServerClient(): Promise<SupabaseClient<Database>> {
  try {
    const cookieStore = await cookies()

    return createSupabaseServerClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
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
          }
        }
      }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Supabase server client"

    throw new Error(message)
  }
}
