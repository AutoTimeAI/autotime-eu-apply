import { redirect } from "next/navigation"

import { createServerClient } from "../lib/supabase/server"
import { getTestAuthUser } from "../lib/test-auth"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  if (getTestAuthUser()) {
    redirect("/dashboard")
  }

  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  redirect(user ? "/dashboard" : "/login")
}
