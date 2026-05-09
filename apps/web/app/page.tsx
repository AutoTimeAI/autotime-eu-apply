import { redirect } from "next/navigation"

import { createServerClient } from "../lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  redirect(user ? "/dashboard" : "/login")
}
